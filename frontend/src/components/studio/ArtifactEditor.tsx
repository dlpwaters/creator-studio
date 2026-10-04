'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/hooks/use-translation'
import type { StudioArtifact, StudioCard } from '@/lib/types/studio'
import { studioCardError } from '@/lib/types/studio-validation'
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
  const [index, setIndex] = useState(0)
  const card = artifact.cards[index]
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
      <nav
        aria-label={t('studio.sections', { count: artifact.cards.length })}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {artifact.cards.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-current={i === index ? 'step' : undefined}
            onClick={() => setIndex(i)}
            className={`shrink-0 rounded-md border px-3 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring ${i === index ? 'border-primary bg-accent' : 'hover:bg-muted'}`}
          >
            {i + 1}.{' '}
            {item.title.length > 25
              ? `${item.title.slice(0, 25)}…`
              : item.title}
          </button>
        ))}
      </nav>
      {card && (
        <div className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
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
          {studioCardError(card, artifact.kind) && (
            <p role="alert" className="text-sm text-destructive">
              {t(studioCardError(card, artifact.kind)!)}
            </p>
          )}
          <CardReferences artifact={artifact} card={card} />
        </div>
      )}
    </fieldset>
  )
}
