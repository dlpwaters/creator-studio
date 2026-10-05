'use client'

import { useEffect, useRef, useState } from 'react'
import {
  readStudioDraft,
  writeStudioDraft,
  clearStudioDraft
} from '@/lib/utils/studio-draft'
import { useRouter } from 'next/navigation'
import {
  NAVIGATION_REQUEST_EVENT,
  type NavigationRequest
} from '@/lib/utils/request-navigation'
import {
  Download,
  Pencil,
  Save,
  Trash2,
  Eye,
  Loader2,
  Copy
} from 'lucide-react'
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
import { studioFormats, studioExports } from './studio-options'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useStudioDelete, useStudioUpdate } from '@/lib/hooks/studio'
import { studioApi } from '@/lib/api/studio'
import type {
  StudioArtifact,
  StudioCapabilities,
  StudioExport
} from '@/lib/types/studio'
import { studioArtifactValid } from '@/lib/types/studio-validation'
import { ArtifactPreview } from './ArtifactPreview'
import { ArtifactEditor } from './ArtifactEditor'
import {
  StudioError,
  StudioWarnings,
  studioFieldClass
} from './StudioPrimitives'

export function ArtifactReview({
  artifact,
  capabilities,
  onUpdated,
  onDeleted,
  onDirtyChange,
  onBusyChange,
  onCopy,
  copying = false
}: {
  artifact: StudioArtifact
  capabilities: StudioCapabilities
  onUpdated: (artifact: StudioArtifact) => void
  onDeleted: () => void
  onDirtyChange: (dirty: boolean) => void
  onBusyChange?: (busy: boolean) => void
  onCopy?: () => void
  copying?: boolean
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null)
  const [initialRecovery] = useState(() => readStudioDraft(artifact))
  const [recovered, setRecovered] = useState(!!initialRecovery)
  const [draftState, setDraft] = useState(initialRecovery ?? artifact)
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(!!initialRecovery)
  // Clean views follow the server; dirty edits keep their original conflict timestamp.
  const draft = dirty ? draftState : artifact
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [format, setFormat] = useState('html')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<unknown>(null)
  const [saved, setSaved] = useState(false)
  const update = useStudioUpdate()
  const remove = useStudioDelete()
  const ownership = useRef(0)
  const mutating = update.isPending || remove.isPending || copying
  const available = artifact.notebook_available !== false
  useEffect(
    () => () => {
      ownership.current++
    },
    []
  )
  useEffect(() => {
    onBusyChange?.(update.isPending || remove.isPending)
    return () => onBusyChange?.(false)
  }, [update.isPending, remove.isPending, onBusyChange])
  useEffect(() => {
    if (recovered) onDirtyChange(true)
  }, [recovered, onDirtyChange])
  useEffect(() => {
    if (dirty) writeStudioDraft(draft)
  }, [dirty, draft])
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const requested = (event: Event) => {
      const request = event as CustomEvent<NavigationRequest>
      event.preventDefault()
      setPendingNavigation(() => request.detail.navigate)
    }
    const clicked = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href]')
          : null
      if (
        !anchor ||
        anchor.hasAttribute('download') ||
        (anchor.target && anchor.target !== '_self')
      )
        return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      let destination: URL
      try {
        destination = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href
      )
        return
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        destination.hash
      )
        return
      event.preventDefault()
      event.stopImmediatePropagation()
      setPendingNavigation(
        () => () =>
          router.push(
            destination.pathname + destination.search + destination.hash
          )
      )
    }
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener(NAVIGATION_REQUEST_EVENT, requested)
    document.addEventListener('click', clicked, true)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener(NAVIGATION_REQUEST_EVENT, requested)
      document.removeEventListener('click', clicked, true)
    }
  }, [dirty, router])

  const valid = studioArtifactValid(draft)
  function change(next: StudioArtifact) {
    if (mutating) return
    setDraft(next)
    setDirty(true)
    onDirtyChange(true)
    setSaved(false)
  }
  async function save() {
    if (!valid || !available || mutating) return
    const owner = ownership.current
    try {
      const result = await update.mutateAsync({
        id: artifact.id,
        data: {
          title: draft.title.trim(),
          cards: draft.cards.map((card) => ({
            ...card,
            bullets: card.bullets.map((point) => point.trim()).filter(Boolean),
            options: card.options?.map((option) => option.trim())
          })),
          expected_updated_at: draft.updated_at
        }
      })
      if (owner !== ownership.current) return
      clearStudioDraft(artifact.id)
      setRecovered(false)
      setDraft(result)
      setDirty(false)
      onDirtyChange(false)
      setSaved(true)
      onUpdated(result)
    } catch {
      /* Keep edits available when a save fails or conflicts. */
    }
  }
  async function download() {
    if (exporting || dirty || mutating) return
    const owner = ownership.current
    setExporting(true)
    setExportError(null)
    try {
      const [extension, narration] = format.split(':')
      const blob = await studioApi.export(
        artifact.id,
        extension as StudioExport,
        narration === 'local' ? 'local' : undefined
      )
      if (owner !== ownership.current) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${artifact.title.replace(/[^\p{L}\p{N}_ -]/gu, '').slice(0, 80) || 'studio'}.${extension === 'markdown' ? 'md' : extension}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      if (owner !== ownership.current) return
      const data = (error as { response?: { data?: unknown } }).response?.data
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text())
          if (owner !== ownership.current) return
          setExportError(
            typeof parsed.detail === 'string' ? parsed.detail : error
          )
        } catch {
          if (owner === ownership.current) setExportError(error)
        }
      } else setExportError(error)
    } finally {
      if (owner === ownership.current) setExporting(false)
    }
  }
  return (
    <article className="min-w-0 space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-accent px-2 py-1 text-primary">
            {t(
              studioFormats.find((item) => item.kind === artifact.kind)!.label
            )}
          </span>
          <span>
            {t(
              artifact.generation === 'ai'
                ? 'studio.aiDraft'
                : 'studio.sourceExcerpts'
            )}
          </span>
          <span>·</span>
          <span>{t('studio.sections', { count: draft.cards.length })}</span>
        </div>
        <h2 className="research-title break-words text-3xl sm:text-4xl">
          {draft.title}
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          {t('studio.reviewNotice')}
        </p>
      </header>
      <StudioWarnings warnings={artifact.warnings} />
      {!available && (
        <p role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">
          {t('studio.orphanNotice')}
        </p>
      )}
      {available && artifact.reference_status === 'snapshot' && (
        <p className="max-w-prose text-sm text-muted-foreground">
          {t('studio.snapshotNotice')}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={!editing ? 'secondary' : 'ghost'}
            aria-pressed={!editing}
            onClick={() => setEditing(false)}
          >
            <Eye className="size-4" />
            {t('studio.preview')}
          </Button>
          <Button
            size="sm"
            variant={editing ? 'secondary' : 'ghost'}
            aria-pressed={editing}
            disabled={!available || mutating}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
            {t('studio.edit')}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-muted-foreground">
              {t('studio.unsaved')}
            </span>
          )}
          {dirty && available && (
            <Button
              size="sm"
              disabled={!valid || mutating}
              onClick={() => void save()}
            >
              <Save className="size-4" />
              {t(update.isPending ? 'studio.saving' : 'studio.save')}
            </Button>
          )}
          {onCopy && (
            <Button
              variant="outline"
              size="sm"
              disabled={dirty || update.isPending || exporting || copying}
              onClick={onCopy}
            >
              {copying ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Copy className="size-4" />
              )}
              {t(
                copying
                  ? 'studio.copying'
                  : available
                    ? 'studio.makeCopy'
                    : 'studio.restoreHere'
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('studio.delete')}
            onClick={() => setDeleteOpen(true)}
            disabled={update.isPending || exporting || copying}
          >
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
      {recovered && (
        <p
          role="status"
          className="rounded-lg bg-accent/50 p-3 text-sm text-primary"
        >
          {t('studio.recoveredDraft')}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-primary">
          {t('studio.saved')}
        </p>
      )}
      {update.isError && (
        <StudioError error={update.error} title={t('studio.requestFailed')} />
      )}
      {editing && available ? (
        <ArtifactEditor
          artifact={draft}
          onChange={change}
          disabled={mutating}
        />
      ) : (
        <ArtifactPreview
          key={`${draft.id}-${draft.updated_at}`}
          artifact={draft}
        />
      )}
      <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="studio-export-format" className="text-sm font-medium">
            {t('studio.export')}
          </label>
          <select
            id="studio-export-format"
            className={`${studioFieldClass} w-auto flex-1 sm:flex-none`}
            value={format}
            disabled={exporting || dirty}
            onChange={(e) => setFormat(e.target.value)}
          >
            {(['html', 'markdown', 'json'] as const).map((value) => (
              <option key={value} value={value}>
                {t(studioExports[value])}
              </option>
            ))}
            {artifact.kind === 'slides' && (
              <option value="pptx" disabled={!capabilities.pptx_available}>
                {t('studio.pptx')}
                {!capabilities.pptx_available ? ' —' : ''}
              </option>
            )}
            {artifact.kind === 'video' && (
              <>
                <option value="mp4" disabled={!capabilities.video_available}>
                  {t('studio.mp4')}
                </option>
                <option value="srt">{t('studio.srt')}</option>
                {capabilities.narration_available && (
                  <>
                    <option
                      value="mp4:local"
                      disabled={!capabilities.video_available}
                    >
                      {t('studio.narratedMp4')}
                    </option>
                    <option value="srt:local">{t('studio.narratedSrt')}</option>
                  </>
                )}
              </>
            )}
          </select>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting || dirty || update.isPending}
            onClick={() => void download()}
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Download className="size-4" />
            )}
            {t(exporting ? 'studio.exporting' : 'studio.export')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('studio.exportHelp')}
          {format.includes(':local') && ` ${t('studio.narrationHelp')}`}
          {format === 'mp4' && ` ${t('studio.videoHelp')}`}
        </p>
        {exportError != null && (
          <StudioError
            error={exportError}
            title={t('studio.requestFailed')}
            retry={() => void download()}
          />
        )}
      </section>
      <AlertDialog
        open={!!pendingNavigation}
        onOpenChange={(open) => {
          if (!open) setPendingNavigation(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{t('studio.discardTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('studio.discardHelp')}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('studio.continueEditing')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutating}
              onClick={() => {
                const navigate = pendingNavigation
                clearStudioDraft(artifact.id)
                setRecovered(false)
                setPendingNavigation(null)
                setDirty(false)
                onDirtyChange(false)
                navigate?.()
              }}
            >
              {t('studio.discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('studio.confirmDelete')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('studio.deleteHelp')}
          </AlertDialogDescription>
          {remove.isError && (
            <StudioError
              error={remove.error}
              title={t('studio.requestFailed')}
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              {t('studio.keep')}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={async () => {
                const owner = ownership.current
                try {
                  await remove.mutateAsync(artifact.id)
                  if (owner !== ownership.current) return
                  clearStudioDraft(artifact.id)
                  setRecovered(false)
                  setDeleteOpen(false)
                  onDirtyChange(false)
                  onDeleted()
                } catch {}
              }}
            >
              {t(remove.isPending ? 'studio.deleting' : 'studio.delete')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
