'use client'

import { useState } from 'react'
import Link from 'next/link'
import { clearStudioDraft } from '@/lib/utils/studio-draft'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowUpRight,
  BookOpen,
  FolderOpen,
  Plus,
  RefreshCw
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
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useStudioArtifacts, useStudioCapabilities } from '@/lib/hooks/studio'
import { useTranslation } from '@/lib/hooks/use-translation'
import type { StudioArtifact } from '@/lib/types/studio'
import { StudioCreateForm } from './StudioCreateForm'
import { studioFormats } from './studio-options'
import { ArtifactReview } from './ArtifactReview'
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
  const notebooks = useNotebooks()
  const capabilities = useStudioCapabilities()
  const artifacts = useStudioArtifacts(notebookId)
  const notebook = notebooks.data?.find((item) => item.id === notebookId)
  function guard(action: () => void) {
    if (dirty) setPendingAction(() => action)
    else action()
  }
  function chooseNotebook(id: string) {
    guard(() => {
      setNotebookId(id)
      setSelected(null)
      setDirty(false)
      setMobileView('create')
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
                disabled={busy || notebooks.isLoading}
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
                disabled={busy}
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
                {artifacts.data?.length ? ` (${artifacts.data.length})` : ''}
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
                  blocked={dirty}
                />
              </aside>
              <section
                aria-label={t('studio.library')}
                inert={busy}
                className={`min-w-0 space-y-6 ${mobileView === 'library' ? 'block' : 'hidden'} lg:block`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-medium">
                    {t('studio.library')}
                    <span className="ml-2 text-xs tabular-nums text-muted-foreground">
                      {artifacts.data?.length ?? 0}
                    </span>
                  </h2>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        guard(() => {
                          setSelected(null)
                          setDirty(false)
                          setMobileView('create')
                        })
                      }
                    >
                      <Plus className="size-4" />
                      {t('studio.create')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('studio.refresh')}
                      disabled={artifacts.isFetching || busy}
                      onClick={() => void artifacts.refetch()}
                    >
                      <RefreshCw className="size-4" />
                    </Button>
                  </div>
                </div>
                {artifacts.isLoading ? (
                  <StudioSkeleton />
                ) : artifacts.isError ? (
                  <StudioError
                    error={artifacts.error}
                    title={t('studio.libraryLoadError')}
                    retry={() => void artifacts.refetch()}
                  />
                ) : artifacts.data && artifacts.data.length > 0 ? (
                  <nav
                    aria-label={t('studio.library')}
                    className="flex max-h-60 flex-wrap gap-2 overflow-y-auto pb-1"
                  >
                    {artifacts.data.map((artifact) => {
                      const Icon =
                        studioFormats.find(
                          (format) => format.kind === artifact.kind
                        )?.icon ?? FolderOpen
                      return (
                        <button
                          key={artifact.id}
                          type="button"
                          disabled={busy}
                          aria-pressed={selected?.id === artifact.id}
                          onClick={() =>
                            guard(() => {
                              setSelected(artifact)
                              setDirty(false)
                              setMobileView('library')
                            })
                          }
                          className={`flex max-w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${selected?.id === artifact.id ? 'border-primary bg-accent/50' : 'bg-card hover:bg-muted'}`}
                        >
                          <Icon className="size-4 shrink-0 text-primary" />
                          <span className="min-w-0">
                            <span className="block max-w-64 truncate text-sm font-medium">
                              {artifact.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {t(
                                studioFormats.find(
                                  (item) => item.kind === artifact.kind
                                )!.label
                              )}{' '}
                              ·{' '}
                              {t('studio.sections', {
                                count: artifact.cards.length
                              })}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </nav>
                ) : null}
                {selected ? (
                  <ArtifactReview
                    key={`${selected.id}-${reviewVersion}`}
                    artifact={selected}
                    capabilities={capabilities.data}
                    onUpdated={setSelected}
                    onDeleted={() => {
                      setSelected(null)
                      setDirty(false)
                    }}
                    onDirtyChange={setDirty}
                  />
                ) : (
                  <div className="flex min-h-96 flex-col items-start justify-center rounded-xl border border-dashed p-8 sm:p-12">
                    <FolderOpen className="mb-5 size-8 text-primary" />
                    <h3 className="research-title text-3xl">
                      {t(
                        artifacts.data?.length
                          ? 'studio.selectArtifact'
                          : 'studio.emptyLibrary'
                      )}
                    </h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                      {t(
                        artifacts.data?.length
                          ? 'studio.selectArtifactHelp'
                          : 'studio.emptyLibraryHelp'
                      )}
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
