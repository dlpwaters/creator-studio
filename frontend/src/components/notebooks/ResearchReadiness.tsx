'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddSourceDialog } from '@/components/sources/AddSourceDialog'
import { useStudioReadiness } from '@/lib/hooks/studio'
import { useTranslation } from '@/lib/hooks/use-translation'

export function ResearchReadiness({ notebookId }: { notebookId: string }) {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch, isFetching } =
    useStudioReadiness(notebookId)
  const [addOpen, setAddOpen] = useState(false)

  if (isLoading) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 pt-2 text-xs text-muted-foreground"
      >
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        {t('workflows.checking')}
      </p>
    )
  }

  if (isError || !data || data.notebook_id !== notebookId) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground"
      >
        <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="max-w-prose">{t('workflows.readinessError')}</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {t('workflows.retry')}
        </Button>
      </div>
    )
  }

  const readySources = data.sources.filter((source) => source.ready).length
  const readyNotes = data.notes.filter((note) => note.ready).length
  const unreadySources = data.sources.filter((source) => !source.ready)
  const processing = unreadySources.filter((source) =>
    ['new', 'pending', 'queued', 'running', 'processing'].includes(
      source.status || ''
    )
  )
  const failed = unreadySources.filter((source) =>
    ['failed', 'error'].includes(source.status || '')
  )
  const unavailable = unreadySources.length - processing.length - failed.length
  const hasReady = readySources + readyNotes > 0
  const hasMaterial = data.sources.length + data.notes.length > 0
  const countText = (key: string, count: number) =>
    t(key).replace('{count}', String(count))

  return (
    <section
      aria-label={t('workflows.readiness')}
      className="space-y-2 pt-2 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          {hasReady ? (
            <CheckCircle2
              className="mt-0.5 size-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
          ) : (
            <AlertCircle
              className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <div className="space-y-1">
            <p className="font-medium">
              {hasReady
                ? t('workflows.ready')
                    .replace(
                      '{sources}',
                      `${readySources} ${t(readySources === 1 ? 'workflows.sourceSingular' : 'workflows.sourcePlural')}`
                    )
                    .replace(
                      '{notes}',
                      `${readyNotes} ${t(readyNotes === 1 ? 'workflows.noteSingular' : 'workflows.notePlural')}`
                    )
                : processing.length > 0
                  ? countText('workflows.processing', processing.length)
                  : failed.length > 0
                    ? countText('workflows.failed', failed.length)
                    : hasMaterial
                      ? t('workflows.needsText')
                      : t('workflows.empty')}
            </p>
            <p className="max-w-prose text-muted-foreground">
              {t(
                hasReady
                  ? 'workflows.readyHint'
                  : processing.length > 0
                    ? 'workflows.processingHint'
                    : failed.length > 0
                      ? 'workflows.failedHint'
                      : hasMaterial
                        ? 'workflows.unavailableHint'
                        : 'workflows.emptyHint'
              )}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-3.5" />
          {t('workflows.addSources')}
        </Button>
      </div>
      {unreadySources.length > 0 && (
        <details className="pl-5.5">
          <summary className="cursor-pointer text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {t('workflows.reviewSources')}
            {' · '}
            {[
              processing.length > 0
                ? countText('workflows.processing', processing.length)
                : '',
              failed.length > 0
                ? countText('workflows.failed', failed.length)
                : '',
              unavailable > 0
                ? countText('workflows.unavailable', unavailable)
                : ''
            ]
              .filter(Boolean)
              .join(' ')}
          </summary>
          <ul className="mt-2 space-y-2">
            {unreadySources.map((source) => (
              <li key={source.id}>
                <Link
                  href={`/notebooks/${encodeURIComponent(notebookId)}?modal=source&id=${encodeURIComponent(source.id)}`}
                  className="inline-block max-w-full rounded-sm break-words text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t('workflows.reviewSource').replace(
                    '{title}',
                    source.title
                  )}
                >
                  {source.title}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
      {addOpen && (
        <AddSourceDialog
          key={notebookId}
          open={addOpen}
          defaultNotebookId={notebookId}
          onOpenChange={(open) => {
            setAddOpen(open)
            if (!open) void refetch()
          }}
        />
      )}
    </section>
  )
}
