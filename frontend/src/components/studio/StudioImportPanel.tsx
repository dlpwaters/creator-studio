'use client'

import { useEffect, useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useStudioImport } from '@/lib/hooks/studio'
import type { StudioArtifact } from '@/lib/types/studio'
import {
  parseStudioImport,
  STUDIO_IMPORT_BYTES,
  type StudioImportPreview
} from '@/lib/utils/studio-import'
import { studioFormats } from './studio-options'
import { StudioError, studioFieldClass } from './StudioPrimitives'

export function StudioImportPanel({
  notebookId,
  notebookName,
  onImported,
  onCancel,
  onBusyChange
}: {
  notebookId: string
  notebookName: string
  onImported: (artifact: StudioArtifact) => void
  onCancel: () => void
  onBusyChange?: (busy: boolean) => void
}) {
  const { t } = useTranslation()
  const transfer = useStudioImport()
  const [preview, setPreview] = useState<StudioImportPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const fileVersion = useRef(0)
  useEffect(
    () => () => {
      fileVersion.current++
    },
    []
  )
  useEffect(() => {
    onBusyChange?.(transfer.isPending)
    return () => onBusyChange?.(false)
  }, [transfer.isPending, onBusyChange])
  async function readFile(file?: File) {
    const version = ++fileVersion.current
    setPreview(null)
    setError(null)
    setReading(false)
    transfer.reset()
    if (!file) return
    setReading(true)
    try {
      if (file.size >= STUDIO_IMPORT_BYTES)
        throw new Error('studio.importLimit')
      const parsed = parseStudioImport(await file.text())
      if (version === fileVersion.current) setPreview(parsed)
    } catch (cause) {
      if (version === fileVersion.current)
        setError(
          cause instanceof Error && cause.message === 'studio.importLimit'
            ? 'studio.importLimit'
            : 'studio.importInvalid'
        )
    } finally {
      if (version === fileVersion.current) setReading(false)
    }
  }
  return (
    <section
      aria-label={t('studio.importTitle')}
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <div>
        <h3 className="font-medium">{t('studio.importTitle')}</h3>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {t('studio.importHelp')}
        </p>
      </div>
      <label className="block text-sm font-medium" htmlFor="studio-import-file">
        {t('studio.importFile')}
      </label>
      <input
        id="studio-import-file"
        type="file"
        accept=".json,application/json"
        className={studioFieldClass}
        disabled={transfer.isPending}
        onChange={(event) => void readFile(event.target.files?.[0])}
        aria-describedby="studio-import-limit"
      />
      <p id="studio-import-limit" className="text-xs text-muted-foreground">
        {t('studio.importLimit')}
      </p>
      {reading && (
        <p role="status" className="text-sm text-muted-foreground">
          {t('studio.opening')}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(error)}
        </p>
      )}
      {preview && (
        <div className="space-y-3 rounded-lg bg-muted/40 p-4">
          <p className="text-xs font-medium text-primary">
            {t('studio.importReview')}
          </p>
          <h4 className="break-words font-medium">{preview.title}</h4>
          <p className="text-sm text-muted-foreground">
            {t(
              studioFormats.find((format) => format.kind === preview.kind)!
                .label
            )}{' '}
            · {t('studio.sections', { count: preview.cardCount })}
          </p>
          <p className="text-sm">
            {t('studio.importDestination', { notebook: notebookName })}
          </p>
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            {t('studio.importSnapshotHelp')}
          </p>
        </div>
      )}
      {transfer.isError && (
        <StudioError error={transfer.error} title={t('studio.requestFailed')} />
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!preview || reading || transfer.isPending}
          onClick={async () => {
            if (!preview) return
            try {
              // Include envelope overhead in the same server bound before submitting.
              const request = {
                format_version: 1 as const,
                notebook_id: notebookId,
                artifact: preview.artifact
              }
              if (
                new TextEncoder().encode(JSON.stringify(request)).byteLength >=
                STUDIO_IMPORT_BYTES
              ) {
                setError('studio.importLimit')
                return
              }
              const version = fileVersion.current
              const imported = await transfer.mutateAsync(request)
              if (version === fileVersion.current) onImported(imported)
            } catch {
              /* The server error remains visible; do not retry implicitly. */
            }
          }}
        >
          {transfer.isPending ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Upload className="size-4" />
          )}
          {t(transfer.isPending ? 'studio.importing' : 'studio.importAction')}
        </Button>
        <Button
          variant="ghost"
          disabled={transfer.isPending}
          onClick={() => {
            fileVersion.current++
            onCancel()
          }}
        >
          {t('studio.importCancel')}
        </Button>
      </div>
    </section>
  )
}
