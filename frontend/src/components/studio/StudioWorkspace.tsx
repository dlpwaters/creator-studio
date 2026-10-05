'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { clearStudioDraft } from '@/lib/utils/studio-draft'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpRight, BookOpen, FolderOpen, Loader2 } from 'lucide-react'
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
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useStudioCopy, useStudioCapabilities } from '@/lib/hooks/studio'
import { studioApi } from '@/lib/api/studio'
import { useTranslation } from '@/lib/hooks/use-translation'
import type { StudioArtifact, StudioArtifactSummary } from '@/lib/types/studio'
import { StudioCreateForm } from './StudioCreateForm'
import { studioFormats } from './studio-options'
import { ArtifactReview } from './ArtifactReview'
import { ArtifactLibrary } from './ArtifactLibrary'
import { StudioImportPanel } from './StudioImportPanel'
import {
  StudioError,
  StudioSkeleton,
  studioFieldClass
} from './StudioPrimitives'

export function StudioWorkspace() {
  const { t } = useTranslation()
  const search = useSearchParams()
  const router = useRouter()
  const [notebookId, setNotebookId] = useState(search.get('notebook') ?? '')
  const [selected, setSelected] = useState<StudioArtifact | null>(null)
  const [mobileView, setMobileView] = useState<'create' | 'library'>('create')
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [reviewVersion, setReviewVersion] = useState(0)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [importing, setImporting] = useState(false)
  const [transferBusy, setTransferBusy] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState<unknown>(null)
  const openVersion = useRef(0)
  useEffect(
    () => () => {
      openVersion.current++
    },
    []
  )
  const notebooks = useNotebooks()
  const capabilities = useStudioCapabilities()
  const copy = useStudioCopy()
  const working =
    busy || opening || copy.isPending || transferBusy || reviewBusy
  const notebook = notebooks.data?.find((item) => item.id === notebookId)
  function guard(action: () => void) {
    if (working) return
    if (dirty) setPendingAction(() => action)
    else action()
  }
  function chooseNotebook(id: string) {
    guard(() => {
      setNotebookId(id)
      setSelected(null)
      setDirty(false)
      setMobileView('create')
      setImporting(false)
      setOpenError(null)
      openVersion.current++
      router.replace(
        id ? `/studio?notebook=${encodeURIComponent(id)}` : '/studio',
        { scroll: false }
      )
    })
  }
  function created(artifact: StudioArtifact) {
    setSelected(artifact)
    setDirty(false)
    setMobileView('library')
    setImporting(false)
    setOpenError(null)
  }
  function openArtifact(summary: StudioArtifactSummary) {
    guard(() => {
      const version = ++openVersion.current
      setOpening(true)
      setOpenError(null)
      void studioApi
        .get(summary.id)
        .then((artifact) => {
          if (version === openVersion.current) created(artifact)
        })
        .catch((error) => {
          if (version === openVersion.current) setOpenError(error)
        })
        .finally(() => {
          if (version === openVersion.current) setOpening(false)
        })
    })
  }
  async function copySelected() {
    if (!selected || dirty || working) return
    try {
      created(
        await copy.mutateAsync({
          id: selected.id,
          data: { notebook_id: notebookId }
        })
      )
    } catch {
      /* Keep the original open and show the transfer error. */
    }
  }
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[100rem] space-y-7 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-medium tracking-wide text-primary">
              {t('studio.eyebrow')}
            </p>
            <h1 className="research-title text-4xl sm:text-5xl">
              {t('studio.title')}
            </h1>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('studio.description')}
            </p>
          </div>
          <div className="flex w-full items-end gap-2 sm:w-auto">
            <div className="min-w-0 flex-1 sm:w-64">
              <label
                htmlFor="studio-notebook"
                className="mb-2 block text-xs font-medium text-muted-foreground"
              >
                {t('studio.notebook')}
              </label>
              <select
                id="studio-notebook"
                className={studioFieldClass}
                value={notebookId}
                disabled={working || notebooks.isLoading}
                onChange={(e) => chooseNotebook(e.target.value)}
              >
                <option value="">{t('studio.chooseNotebook')}</option>
                {notebookId && !notebook && (
                  <option value={notebookId}>{notebookId}</option>
                )}
                {notebooks.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            {notebookId && (
              <Button
                variant="outline"
                size="icon"
                aria-label={t('studio.backToNotebook')}
                disabled={working}
                onClick={() =>
                  guard(() =>
                    router.push(`/notebooks/${encodeURIComponent(notebookId)}`)
                  )
                }
              >
                <ArrowUpRight className="size-4" />
              </Button>
            )}
          </div>
        </header>
        {notebooks.isError && (
          <StudioError
            error={notebooks.error}
            title={t('studio.loadError')}
            retry={() => void notebooks.refetch()}
          />
        )}
        {capabilities.isError && (
          <StudioError
            error={capabilities.error}
            title={t('studio.loadError')}
            retry={() => void capabilities.refetch()}
          />
        )}
        {capabilities.isLoading && <StudioSkeleton />}
        {!notebookId && (
          <section className="grid min-h-80 items-center gap-8 rounded-2xl border bg-card p-8 sm:grid-cols-[1fr_auto] sm:p-12">
            <div className="max-w-lg">
              <BookOpen className="mb-5 size-8 text-primary" />
              <h2 className="research-title text-3xl">
                {t('studio.noNotebook')}
              </h2>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
                {t(
                  notebooks.data?.length === 0
                    ? 'studio.noNotebooks'
                    : 'studio.noNotebookHelp'
                )}
              </p>
              <Button variant="outline" className="mt-6" asChild>
                <Link href="/notebooks">
                  {t('studio.openNotebooks')}
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="hidden max-w-xs space-y-3 border-l pl-8 sm:block">
              {studioFormats.slice(0, 5).map(({ kind, icon: Icon }) => (
                <div
                  key={kind}
                  className="flex items-center gap-3 py-1 text-sm text-muted-foreground"
                >
                  <Icon className="size-4 text-primary" />
                  {t(studioFormats.find((item) => item.kind === kind)!.label)}
                </div>
              ))}
            </div>
          </section>
        )}
        {notebookId && capabilities.data && (
          <>
            <div className="flex gap-2 lg:hidden">
              <Button
                variant={mobileView === 'create' ? 'secondary' : 'ghost'}
                className="flex-1"
                aria-pressed={mobileView === 'create'}
                onClick={() => setMobileView('create')}
              >
                {t('studio.create')}
              </Button>
              <Button
                variant={mobileView === 'library' ? 'secondary' : 'ghost'}
                className="flex-1"
                aria-pressed={mobileView === 'library'}
                onClick={() => setMobileView('library')}
              >
                {t('studio.library')}
              </Button>
            </div>
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(20rem,25rem)_minmax(0,1fr)] xl:gap-8">
              <aside
                aria-label={t('studio.create')}
                className={`workspace-panel min-w-0 p-5 sm:p-6 ${mobileView === 'create' ? 'block' : 'hidden'} lg:block`}
              >
                <StudioCreateForm
                  key={notebookId}
                  notebookId={notebookId}
                  capabilities={capabilities.data}
                  onCreated={created}
                  onBusy={setBusy}
                  blocked={
                    dirty ||
                    opening ||
                    copy.isPending ||
                    importing ||
                    reviewBusy
                  }
                />
              </aside>
              <section
                aria-label={t('studio.library')}
                inert={busy || opening}
                className={`min-w-0 space-y-6 ${mobileView === 'library' ? 'block' : 'hidden'} lg:block`}
              >
                <ArtifactLibrary
                  key={notebookId}
                  notebookId={notebookId}
                  selectedId={selected?.id}
                  disabled={working}
                  onSelect={openArtifact}
                  onImport={() =>
                    guard(() => {
                      setImporting(true)
                      setMobileView('library')
                    })
                  }
                  onCreate={() =>
                    guard(() => {
                      setSelected(null)
                      setDirty(false)
                      setImporting(false)
                      setMobileView('create')
                    })
                  }
                />
                {importing && (
                  <StudioImportPanel
                    key={notebookId}
                    notebookId={notebookId}
                    notebookName={notebook?.name ?? notebookId}
                    onImported={created}
                    onCancel={() => setImporting(false)}
                    onBusyChange={setTransferBusy}
                  />
                )}
                {opening && (
                  <p
                    role="status"
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    {t('studio.opening')}
                  </p>
                )}
                {openError != null && (
                  <StudioError
                    error={openError}
                    title={t('studio.transferFailed')}
                  />
                )}
                {copy.isError && (
                  <StudioError
                    error={copy.error}
                    title={t('studio.transferFailed')}
                  />
                )}
                {selected && !importing ? (
                  <ArtifactReview
                    key={`${selected.id}-${reviewVersion}`}
                    artifact={selected}
                    capabilities={capabilities.data}
                    onUpdated={setSelected}
                    onCopy={() => void copySelected()}
                    copying={copy.isPending}
                    onDeleted={() => {
                      setSelected(null)
                      setDirty(false)
                    }}
                    onDirtyChange={setDirty}
                    onBusyChange={setReviewBusy}
                  />
                ) : importing ? null : (
                  <div className="flex min-h-96 flex-col items-start justify-center rounded-xl border border-dashed p-8 sm:p-12">
                    <FolderOpen className="mb-5 size-8 text-primary" />
                    <h3 className="research-title text-3xl">
                      {t('studio.selectArtifact')}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                      {t('studio.selectArtifactHelp')}
                    </p>
                    <div className="mt-8 flex flex-wrap gap-2">
                      {studioFormats.slice(0, 3).map(({ kind, icon: Icon }) => (
                        <span
                          key={kind}
                          className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground"
                        >
                          <Icon className="size-3" />
                          {t(
                            studioFormats.find((item) => item.kind === kind)!
                              .label
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
        <AlertDialog
          open={!!pendingAction}
          onOpenChange={(open) => {
            if (!open) setPendingAction(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogTitle>{t('studio.discardTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('studio.discardHelp')}
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t('studio.continueEditing')}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={working}
                onClick={() => {
                  const action = pendingAction
                  if (selected) clearStudioDraft(selected.id)
                  setPendingAction(null)
                  setDirty(false)
                  setReviewVersion((value) => value + 1)
                  action?.()
                }}
              >
                {t('studio.discard')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
