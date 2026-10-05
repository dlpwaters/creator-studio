'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { studioFormats } from './studio-options'
import { useTranslation } from '@/lib/hooks/use-translation'
import type { StudioArtifact, StudioCard } from '@/lib/types/studio'
import { safeSourceUrl } from './StudioPrimitives'

export function CardReferences({
  artifact,
  card
}: {
  artifact: StudioArtifact
  card: StudioCard
}) {
  const { t } = useTranslation()
  const references = artifact.sources.filter((source) =>
    card.source_ids.includes(source.id)
  )
  return (
    <div className="mt-5 border-t pt-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {t('studio.provenance')}
      </p>
      {references.length ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {references.map((source) => (
            <li key={source.id} className="max-w-full break-words">
              {safeSourceUrl(source.url) ? (
                <a
                  href={safeSourceUrl(source.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  {source.title}
                </a>
              ) : (
                <span>{source.title}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t('studio.noCitations')}
        </p>
      )}
    </div>
  )
}
function CardText({ card }: { card: StudioCard }) {
  return (
    <>
      <p className="max-w-prose whitespace-pre-wrap break-words text-base leading-relaxed">
        {card.body}
      </p>
      {card.bullets.length > 0 && (
        <ul className="mt-5 max-w-prose list-disc space-y-2 pl-5 leading-relaxed">
          {card.bullets.map((point, i) => (
            <li key={i} className="break-words">
              {point}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
function StudyCard({ card, quiz }: { card: StudioCard; quiz: boolean }) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)
  const [choice, setChoice] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const hasChoices =
    quiz &&
    !!card.options?.length &&
    card.correct_option != null &&
    card.correct_option >= 0 &&
    card.correct_option < card.options.length
  return (
    <div className="space-y-5">
      <p className="max-w-prose whitespace-pre-wrap break-words text-xl leading-relaxed">
        {card.question || card.title}
      </p>
      {hasChoices ? (
        <>
          <fieldset className="space-y-2">
            <legend className="sr-only">{t('studio.options')}</legend>
            {card.options!.map((option, i) => (
              <label
                key={i}
                className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${choice === i ? 'border-primary bg-accent/50' : 'hover:bg-muted'}`}
              >
                <input
                  type="radio"
                  name={`quiz-${card.id}`}
                  checked={choice === i}
                  onChange={() => {
                    setChoice(i)
                    setChecked(false)
                  }}
                  className="mt-1 accent-primary"
                />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <Button
            variant="outline"
            onClick={() => {
              setChecked(true)
              setRevealed(true)
            }}
            disabled={choice === null}
          >
            {t('studio.checkAnswer')}
          </Button>
          {checked && (
            <p role="status" className="font-medium text-primary">
              {t(
                choice === card.correct_option
                  ? 'studio.correct'
                  : 'studio.tryAnswer'
              )}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t('studio.selfReview')}
          </p>
          <Button
            variant="outline"
            onClick={() => setRevealed(!revealed)}
            aria-expanded={revealed}
          >
            {t(revealed ? 'studio.hideAnswer' : 'studio.reveal')}
          </Button>
        </>
      )}
      {revealed && (
        <div className="rounded-lg bg-accent/50 p-5">
          <p className="mb-2 text-xs font-medium text-primary">
            {t('studio.answer')}
          </p>
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {card.answer || card.body}
          </p>
          {card.bullets.length > 0 && (
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {card.bullets.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
export function ArtifactPreview({ artifact }: { artifact: StudioArtifact }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const card = artifact.cards[index]
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => {
      setReducedMotion(media.matches)
      if (media.matches) setPlaying(false)
    }
    change()
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    if (!playing || reducedMotion || !card) return
    const timer = setTimeout(
      () => {
        if (index >= artifact.cards.length - 1) setPlaying(false)
        else setIndex(index + 1)
      },
      Math.max(5, Math.min(60, card.duration_seconds)) * 1000
    )
    return () => clearTimeout(timer)
  }, [playing, reducedMotion, card, index, artifact.cards.length])
  function navigate(next: number) {
    setPlaying(false)
    setIndex(Math.max(0, Math.min(artifact.cards.length - 1, next)))
  }
  if (!card)
    return (
      <p className="p-8 text-muted-foreground">{t('studio.emptyPreview')}</p>
    )
  if (
    artifact.kind === 'mindmap' ||
    artifact.kind === 'timeline' ||
    artifact.kind === 'brief'
  ) {
    return (
      <div className="space-y-5">
        {artifact.kind !== 'brief' && (
          <p className="text-sm text-muted-foreground">
            {t(
              artifact.kind === 'mindmap'
                ? 'studio.conceptMapHelp'
                : 'studio.timelineHelp'
            )}
          </p>
        )}
        {artifact.kind === 'mindmap' && (
          <div className="mx-auto max-w-md rounded-xl bg-primary px-6 py-5 text-center text-lg font-medium text-primary-foreground">
            {artifact.title}
          </div>
        )}
        <ol
          className={
            artifact.kind === 'mindmap'
              ? 'grid gap-4 md:grid-cols-2'
              : 'space-y-4'
          }
        >
          {artifact.cards.map((item, i) => (
            <li
              key={item.id}
              className={`relative rounded-xl bg-card p-5 sm:p-6 ${artifact.kind === 'timeline' ? 'ml-4 border-l-2 border-primary' : 'border'}`}
            >
              <div className="mb-3 flex items-start gap-3">
                <span className="font-mono text-xs tabular-nums text-primary">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-lg font-semibold tracking-tight">
                  {item.title}
                </h3>
              </div>
              <CardText card={item} />
              <CardReferences artifact={artifact} card={item} />
            </li>
          ))}
        </ol>
      </div>
    )
  }
  return (
    <section
      aria-label={t('studio.preview')}
      tabIndex={0}
      className="space-y-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          navigate(index + 1)
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          navigate(index - 1)
        }
      }}
    >
      <article
        className={`min-h-80 rounded-xl border p-6 sm:min-h-96 sm:p-10 ${artifact.style === 'chalkboard' ? 'bg-accent/60' : artifact.style === 'minimal' ? 'bg-background' : 'bg-card'}`}
      >
        <div className="mb-7 flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>
            {t(
              studioFormats.find((item) => item.kind === artifact.kind)!.label
            )}
          </span>
          <span className="font-mono tabular-nums">
            {t('studio.sectionOf', {
              current: index + 1,
              total: artifact.cards.length
            })}
          </span>
        </div>
        <h3
          className={`mb-6 break-words text-3xl leading-tight sm:text-4xl ${artifact.style === 'editorial' ? 'research-title' : 'font-semibold tracking-tight'}`}
        >
          {card.title}
        </h3>
        {artifact.kind === 'quiz' || artifact.kind === 'flashcards' ? (
          <StudyCard
            key={card.id}
            card={card}
            quiz={artifact.kind === 'quiz'}
          />
        ) : (
          <CardText card={card} />
        )}
        <CardReferences artifact={artifact} card={card} />
      </article>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={t('studio.previous')}
            disabled={index === 0}
            onClick={() => navigate(index - 1)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <span className="min-w-14 text-center font-mono text-xs tabular-nums">
            {index + 1} / {artifact.cards.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label={t('studio.next')}
            disabled={index === artifact.cards.length - 1}
            onClick={() => navigate(index + 1)}
          >
            <ArrowRight className="size-4" />
          </Button>
        </div>
        {artifact.kind === 'video' && (
          <Button
            variant="outline"
            size="sm"
            disabled={reducedMotion}
            onClick={() => {
              if (!playing && index === artifact.cards.length - 1) setIndex(0)
              setPlaying(!playing)
            }}
          >
            {playing ? (
              <Pause className="size-4" />
            ) : index === artifact.cards.length - 1 ? (
              <RotateCcw className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
            {t(playing ? 'studio.pause' : 'studio.play')}
          </Button>
        )}
      </div>
      {artifact.kind === 'video' && (
        <>
          <p className="text-xs text-muted-foreground">
            {reducedMotion ? t('studio.reducedMotion') : t('studio.videoHelp')}
          </p>
          <div
            className="flex flex-wrap gap-1"
            aria-label={t('studio.sections', { count: artifact.cards.length })}
          >
            {artifact.cards.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`${i + 1}. ${item.title}`}
                aria-current={index === i ? 'step' : undefined}
                onClick={() => navigate(i)}
                className="flex min-h-7 min-w-6 flex-1 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span
                  className={`h-2 w-full rounded-sm ${i <= index ? 'bg-primary' : 'bg-muted'}`}
                />
              </button>
            ))}
          </div>
          {card.notes && (
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {t('studio.speakerNotes')}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {card.notes}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
