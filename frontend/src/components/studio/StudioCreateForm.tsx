'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useModels, useModelDefaults } from '@/lib/hooks/use-models'
import { useStudioGenerate, useStudioReadiness } from '@/lib/hooks/studio'
import type {
  StudioArtifact,
  StudioCapabilities,
  StudioKind,
  StudioStyle
} from '@/lib/types/studio'
import { SourceSelection } from './SourceSelection'
import {
  StudioError,
  StudioSkeleton,
  studioFieldClass
} from './StudioPrimitives'

import { studioFormats, studioGeneration, studioStyles } from './studio-options'

export function StudioCreateForm({
  notebookId,
  capabilities,
  onCreated,
  onBusy,
  blocked = false
}: {
  notebookId: string
  capabilities: StudioCapabilities
  onCreated: (artifact: StudioArtifact) => void
  onBusy: (busy: boolean) => void
  blocked?: boolean
}) {
  const { t, language } = useTranslation()
  const readiness = useStudioReadiness(notebookId)
  const models = useModels()
  const defaults = useModelDefaults()
  const mutation = useStudioGenerate()
  const [kind, setKind] = useState<StudioKind>('slides')
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [style, setStyle] = useState<StudioStyle>('editorial')
  const [outputLanguage, setOutputLanguage] = useState(language || 'en-US')
  const [cardCount, setCardCount] = useState(6)
  const [generation, setGeneration] = useState<'extractive' | 'ai'>(
    'extractive'
  )
  const [modelId, setModelId] = useState('')
  const [selection, setSelection] = useState<string[] | null>(null)
  const material = readiness.data
  const selected = (
    selection ??
    [...(material?.sources ?? []), ...(material?.notes ?? [])]
      .filter((item) => item.ready)
      .map((item) => item.id)
  ).filter((id) =>
    [...(material?.sources ?? []), ...(material?.notes ?? [])].some(
      (item) => item.id === id && item.ready
    )
  )
  const languageModels =
    models.data?.filter((model) => model.type === 'language') ?? []
  const defaultId =
    defaults.data?.default_transformation_model ??
    defaults.data?.default_chat_model
  const effectiveModelId = modelId || defaultId
  const ready =
    !blocked &&
    !!material &&
    selected.length > 0 &&
    selected.length <= 150 &&
    !!topic.trim() &&
    outputLanguage.trim().length > 0 &&
    Number.isInteger(cardCount) &&
    cardCount >= 3 &&
    cardCount <= 20 &&
    capabilities.supported_kinds.includes(kind) &&
    (generation === 'extractive' ||
      (capabilities.ai_available && !!effectiveModelId))
  async function generate(event: React.FormEvent) {
    event.preventDefault()
    if (!ready || !material) return
    onBusy(true)
    try {
      const artifact = await mutation.mutateAsync({
        notebook_id: notebookId,
        kind,
        topic: topic.trim(),
        audience: audience.trim() || t('studio.audiencePlaceholder'),
        style,
        language: outputLanguage.trim(),
        card_count: cardCount,
        source_ids: material.sources
          .filter((item) => selected.includes(item.id))
          .map((item) => item.id),
        note_ids: material.notes
          .filter((item) => selected.includes(item.id))
          .map((item) => item.id),
        generation,
        model_id: generation === 'ai' ? effectiveModelId : null
      })
      onCreated(artifact)
    } catch {
      /* The inline error preserves the full selection for an explicit retry. */
    } finally {
      onBusy(false)
    }
  }
  return (
    <form onSubmit={generate} className="space-y-6">
      <fieldset disabled={mutation.isPending} className="min-w-0 space-y-6">
        <section className="space-y-3">
          <h2 className="text-lg font-medium tracking-tight">
            {t('studio.format')}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {studioFormats
              .filter((format) =>
                capabilities.supported_kinds.includes(format.kind)
              )
              .map(({ kind: format, icon: Icon }) => (
                <button
                  key={format}
                  type="button"
                  aria-pressed={kind === format}
                  onClick={() => setKind(format)}
                  className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${kind === format ? 'border-primary bg-accent text-accent-foreground' : 'bg-background hover:bg-muted'}`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>
                    {t(
                      studioFormats.find((item) => item.kind === format)!.label
                    )}
                  </span>
                </button>
              ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {t(studioFormats.find((item) => item.kind === kind)!.description)}
          </p>
        </section>
        <div>
          <label
            htmlFor="studio-topic"
            className="mb-2 block text-sm font-medium"
          >
            {t('studio.topic')}
          </label>
          <input
            id="studio-topic"
            className={studioFieldClass}
            value={topic}
            maxLength={300}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t('studio.topicPlaceholder')}
            required
          />
        </div>
        {readiness.isLoading ? (
          <StudioSkeleton />
        ) : readiness.isError ? (
          <StudioError
            error={readiness.error}
            title={t('studio.sourceLoadError')}
            retry={() => void readiness.refetch()}
          />
        ) : material ? (
          <SourceSelection
            readiness={material}
            selected={selected}
            onChange={setSelection}
          />
        ) : null}
        <fieldset className="space-y-3">
          <legend className="mb-2 text-sm font-medium">
            {t('studio.generation')}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(['extractive', 'ai'] as const).map((mode) => (
              <label
                key={mode}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${generation === mode ? 'border-primary bg-accent/50' : ''}`}
              >
                <input
                  type="radio"
                  name="generation"
                  value={mode}
                  checked={generation === mode}
                  disabled={mode === 'ai' && !capabilities.ai_available}
                  onChange={() => setGeneration(mode)}
                  className="accent-primary"
                />
                {t(studioGeneration[mode].label)}
              </label>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t(studioGeneration[generation].help)}
          </p>
          {!capabilities.ai_available && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('studio.aiUnavailable')}{' '}
              <Link
                href="/settings/api-keys"
                className="text-primary underline"
              >
                {t('studio.modelSetup')}
              </Link>
            </p>
          )}
          {generation === 'ai' && (
            <div>
              <label
                htmlFor="studio-model"
                className="mb-2 block text-sm font-medium"
              >
                {t('studio.model')}
              </label>
              <select
                id="studio-model"
                className={studioFieldClass}
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              >
                <option value="">
                  {defaultId
                    ? `${t('studio.defaultModel')} · ${languageModels.find((model) => model.id === defaultId)?.name ?? defaultId}`
                    : t('studio.noDefaultModel')}
                </option>
                {languageModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} · {model.provider}
                  </option>
                ))}
              </select>
              {models.isError && (
                <StudioError
                  error={models.error}
                  title={t('studio.loadError')}
                  retry={() => void models.refetch()}
                />
              )}
            </div>
          )}
        </fieldset>
        <details className="rounded-lg border p-3">
          <summary className="flex cursor-pointer items-center justify-between text-sm font-medium focus-visible:outline-ring">
            {t('studio.advanced')}
            <ChevronDown className="size-4" />
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="studio-audience" className="mb-2 block text-sm">
                {t('studio.audience')}
              </label>
              <input
                id="studio-audience"
                className={studioFieldClass}
                value={audience}
                maxLength={300}
                onChange={(e) => setAudience(e.target.value)}
                placeholder={t('studio.audiencePlaceholder')}
              />
            </div>
            <div>
              <label htmlFor="studio-style" className="mb-2 block text-sm">
                {t('studio.style')}
              </label>
              <select
                id="studio-style"
                className={studioFieldClass}
                value={style}
                onChange={(e) => setStyle(e.target.value as StudioStyle)}
              >
                {(['editorial', 'chalkboard', 'minimal'] as const).map(
                  (value) => (
                    <option key={value} value={value}>
                      {t(studioStyles[value])}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label htmlFor="studio-count" className="mb-2 block text-sm">
                {t('studio.cardCount')}
              </label>
              <input
                id="studio-count"
                type="number"
                min={3}
                max={20}
                className={studioFieldClass}
                value={cardCount}
                onChange={(e) => setCardCount(Number(e.target.value))}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="studio-language" className="mb-2 block text-sm">
                {t('studio.language')}
              </label>
              <input
                id="studio-language"
                className={studioFieldClass}
                value={outputLanguage}
                maxLength={80}
                required
                onChange={(e) => setOutputLanguage(e.target.value)}
              />
            </div>
          </div>
        </details>
      </fieldset>
      {mutation.isError && (
        <StudioError error={mutation.error} title={t('studio.requestFailed')} />
      )}
      {mutation.isPending ? (
        <div role="status" className="rounded-lg bg-accent/50 p-4">
          <div className="flex items-center gap-2 font-medium">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            {t('studio.creating')}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('studio.creatingHelp')}
          </p>
        </div>
      ) : (
        <>
          <Button type="submit" className="w-full" disabled={!ready}>
            {t('studio.generate')}
            <ArrowRight className="size-4" />
          </Button>
          {!ready && (
            <p className="text-xs text-muted-foreground">
              {t(
                blocked
                  ? 'studio.unsaved'
                  : selected.length > 150
                    ? 'studio.selectionLimit'
                    : 'studio.required'
              )}
            </p>
          )}
        </>
      )}
    </form>
  )
}
