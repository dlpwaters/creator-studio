'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/lib/hooks/use-translation'
import type { StudioArtifact, StudioCard } from '@/lib/types/studio'
import { studioCardError } from '@/lib/types/studio-validation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog'
import { Plus, Copy, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react'
import { CardReferences } from './ArtifactPreview'
import { studioFieldClass } from './StudioPrimitives'

export function ArtifactEditor({
  artifact,
  onChange,
  disabled
}: {
  artifact: StudioArtifact
  onChange: (artifact: StudioArtifact) => void
  disabled: boolean
}) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState(artifact.cards[0]?.id)
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)
  const focusRequested = useRef(false)
  const index = Math.max(
    0,
    artifact.cards.findIndex((item) => item.id === selectedId)
  )
  const card = artifact.cards[index]
  const allowedCitations = [...artifact.source_ids, ...artifact.note_ids]
  const evidence = artifact.sources.filter(
    (source, i, all) =>
      allowedCitations.includes(source.id) &&
      all.findIndex((item) => item.id === source.id) === i
  )
  const cardError = card
    ? studioCardError(card, artifact.kind, allowedCitations)
    : undefined
  useEffect(() => {
    if (focusRequested.current) {
      titleRef.current?.focus()
      focusRequested.current = false
    }
  }, [selectedId])
  function freshId() {
    const random =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) =>
            part.toString(16).padStart(8, '0')
          ).join('')
    const base = `card-${random}`
    let id = base,
      suffix = 1
    while (artifact.cards.some((item) => item.id === id))
      id = `${base}-${suffix++}`
    return id
  }
  function selectNew(next: StudioArtifact, id: string, message: string) {
    focusRequested.current = true
    onChange(next)
    setSelectedId(id)
    setAnnouncement(message)
  }
  function addSection() {
    if (disabled || artifact.cards.length >= 20) return
    const added: StudioCard = {
      id: freshId(),
      title: '',
      body: '',
      bullets: [],
      notes: '',
      source_ids: [],
      duration_seconds: 15,
      question: null,
      answer: null,
      options: [],
      correct_option: null
    }
    selectNew(
      { ...artifact, cards: [...artifact.cards, added] },
      added.id,
      'studio.sectionAdded'
    )
  }
  function duplicateSection() {
    if (disabled || !card || artifact.cards.length >= 20) return
    const duplicate = {
      ...card,
      id: freshId(),
      bullets: [...card.bullets],
      source_ids: [...card.source_ids],
      options: card.options ? [...card.options] : undefined
    }
    const cards = [...artifact.cards]
    cards.splice(index + 1, 0, duplicate)
    selectNew({ ...artifact, cards }, duplicate.id, 'studio.sectionDuplicated')
  }
  function moveSection(offset: -1 | 1) {
    const destination = index + offset
    if (
      disabled ||
      !card ||
      destination < 0 ||
      destination >= artifact.cards.length
    )
      return
    const cards = [...artifact.cards]
    cards.splice(index, 1)
    cards.splice(destination, 0, card)
    onChange({ ...artifact, cards })
    setSelectedId(card.id)
    setAnnouncement('studio.sectionMoved')
  }
  function removeSection() {
    if (disabled || artifact.cards.length <= 1 || !pendingRemoval) return
    const removedIndex = artifact.cards.findIndex(
      (item) => item.id === pendingRemoval
    )
    if (removedIndex < 0) {
      setPendingRemoval(null)
      return
    }
    const cards = artifact.cards.filter((item) => item.id !== pendingRemoval)
    const nextId = cards[Math.min(removedIndex, cards.length - 1)].id
    setPendingRemoval(null)
    selectNew({ ...artifact, cards }, nextId, 'studio.sectionRemoved')
  }
  function update(patch: Partial<StudioCard>) {
    onChange({
      ...artifact,
      cards: artifact.cards.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      )
    })
  }
  function textField(
    key: 'title' | 'body' | 'notes' | 'question' | 'answer',
    label: string,
    multiline = true
  ) {
    const id = `studio-card-${key}`
    return (
      <div>
        <label htmlFor={id} className="mb-2 block text-sm font-medium">
          {t(label)}
        </label>
        {multiline ? (
          <textarea
            id={id}
            className={`${studioFieldClass} min-h-28 resize-y`}
            value={card[key] ?? ''}
            onChange={(e) => update({ [key]: e.target.value })}
            maxLength={key === 'question' ? 2000 : 6000}
          />
        ) : (
          <input
            id={id}
            ref={titleRef}
            className={studioFieldClass}
            value={card[key] ?? ''}
            onChange={(e) => update({ [key]: e.target.value })}
            maxLength={300}
            required
          />
        )}
      </div>
    )
  }
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-5">
      <div>
        <label
          htmlFor="studio-artifact-title"
          className="mb-2 block text-sm font-medium"
        >
          {t('studio.artifactTitle')}
        </label>
        <input
          id="studio-artifact-title"
          className={studioFieldClass}
          value={artifact.title}
          maxLength={300}
          required
          onChange={(e) => onChange({ ...artifact, title: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || artifact.cards.length >= 20}
          onClick={addSection}
        >
          <Plus className="size-4" />
          {t('studio.addSection')}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t('studio.sectionLimit')}
        </p>
      </div>
      {announcement && (
        <p role="status" className="text-sm text-primary">
          {t(announcement)}
        </p>
      )}
      <nav
        aria-label={t('studio.sections', { count: artifact.cards.length })}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {artifact.cards.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-current={i === index ? 'step' : undefined}
            onClick={() => setSelectedId(item.id)}
            className={`shrink-0 rounded-md border px-3 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring ${i === index ? 'border-primary bg-accent' : 'hover:bg-muted'}`}
          >
            {i + 1}.{' '}
            {item.title.length > 25
              ? `${item.title.slice(0, 25)}…`
              : item.title || t('studio.untitledSection')}
          </button>
        ))}
      </nav>
      {card && (
        <div className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || artifact.cards.length >= 20}
              onClick={duplicateSection}
            >
              <Copy className="size-4" />
              {t('studio.duplicateSection')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || index === 0}
              onClick={() => moveSection(-1)}
            >
              <ArrowLeft className="size-4" />
              {t('studio.moveEarlier')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || index === artifact.cards.length - 1}
              onClick={() => moveSection(1)}
            >
              <ArrowRight className="size-4" />
              {t('studio.moveLater')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || artifact.cards.length <= 1}
              onClick={() => setPendingRemoval(card.id)}
            >
              <Trash2 className="size-4" />
              {t('studio.removeSection')}
            </Button>
          </div>
          {textField('title', 'studio.cardTitle', false)}
          {textField('body', 'studio.body')}
          <div>
            <label
              htmlFor="studio-card-bullets"
              className="mb-2 block text-sm font-medium"
            >
              {t('studio.bullets')}
            </label>
            <textarea
              id="studio-card-bullets"
              rows={4}
              className={studioFieldClass}
              value={card.bullets.join('\n')}
              maxLength={9615}
              onChange={(e) => update({ bullets: e.target.value.split('\n') })}
            />
          </div>
          {(artifact.kind === 'quiz' || artifact.kind === 'flashcards') && (
            <>
              {textField('question', 'studio.question')}
              {textField('answer', 'studio.answer')}
              {artifact.kind === 'quiz' && (
                <>
                  <div>
                    <label
                      htmlFor="studio-card-options"
                      className="mb-2 block text-sm font-medium"
                    >
                      {t('studio.options')}
                    </label>
                    <textarea
                      id="studio-card-options"
                      rows={4}
                      className={studioFieldClass}
                      value={card.options?.join('\n') ?? ''}
                      maxLength={4807}
                      onChange={(e) => {
                        const options = e.target.value
                          ? e.target.value.split('\n')
                          : []
                        update({
                          options,
                          correct_option:
                            card.correct_option != null &&
                            card.correct_option < options.length
                              ? card.correct_option
                              : null
                        })
                      }}
                    />
                  </div>
                  {!!card.options?.length && (
                    <div>
                      <label
                        htmlFor="studio-card-correct"
                        className="mb-2 block text-sm font-medium"
                      >
                        {t('studio.correctOption')}
                      </label>
                      <select
                        id="studio-card-correct"
                        className={studioFieldClass}
                        value={card.correct_option ?? ''}
                        onChange={(e) =>
                          update({
                            correct_option:
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                          })
                        }
                      >
                        <option value="">—</option>
                        {card.options.map((_, i) => (
                          <option key={i} value={i}>
                            {t('studio.optionNumber', { number: i + 1 })}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {textField('notes', 'studio.speakerNotes')}
          {artifact.kind === 'video' && (
            <div>
              <label
                htmlFor="studio-card-duration"
                className="mb-2 block text-sm font-medium"
              >
                {t('studio.duration')}
              </label>
              <input
                id="studio-card-duration"
                type="number"
                min={5}
                max={60}
                className={studioFieldClass}
                value={card.duration_seconds}
                onChange={(e) =>
                  update({ duration_seconds: Number(e.target.value) })
                }
              />
            </div>
          )}
          <fieldset className="space-y-3 border-t pt-5">
            <legend className="text-sm font-medium">
              {t('studio.editingEvidence')}
            </legend>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('studio.editingEvidenceHelp')}
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {evidence.map((source) => (
                <label
                  key={source.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md p-2 text-sm transition-colors hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    className="mt-1 accent-primary"
                    checked={card.source_ids.includes(source.id)}
                    onChange={() =>
                      update({
                        source_ids: card.source_ids.includes(source.id)
                          ? card.source_ids.filter((id) => id !== source.id)
                          : [...card.source_ids, source.id]
                      })
                    }
                  />
                  <span className="break-words">{source.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {cardError && (
            <p role="alert" className="text-sm text-destructive">
              {t(cardError)}
            </p>
          )}
          <CardReferences artifact={artifact} card={card} />
        </div>
      )}
      <AlertDialog
        open={!!pendingRemoval}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>
            {t('studio.confirmRemoveSection')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('studio.removeSectionDescription', {
              title:
                artifact.cards.find((item) => item.id === pendingRemoval)
                  ?.title || t('studio.untitledSection')
            })}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('studio.keepSection')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled || artifact.cards.length <= 1}
              onClick={removeSection}
            >
              {t('studio.removeSection')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </fieldset>
  )
}
