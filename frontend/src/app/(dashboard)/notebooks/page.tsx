'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  RefreshCw,
  LayoutGrid,
  List,
  Search,
  X,
  BookOpen,
  FileText,
  MessageSquare,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { NotebookList } from './components/NotebookList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreateNotebookDialog } from '@/components/notebooks/CreateNotebookDialog'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useCreateDialogs } from '@/lib/hooks/use-create-dialogs'
import { useNotebookViewStore } from '@/lib/stores/notebook-view-store'
import {
  getVisibleNotebooks,
  type NotebookSort,
} from '@/lib/utils/notebook-library'

export default function NotebooksPage() {
  const { t, language } = useTranslation()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sort, setSort] = useState<NotebookSort>('updated')
  const viewMode = useNotebookViewStore((state) => state.viewMode)
  const setViewMode = useNotebookViewStore((state) => state.setViewMode)
  const { openSourceDialog } = useCreateDialogs()
  const active = useNotebooks(false)
  const archived = useNotebooks(true)
  const filteredActive = useMemo(
    () => getVisibleNotebooks(active.data, searchTerm, sort, language),
    [active.data, searchTerm, sort, language],
  )
  const filteredArchived = useMemo(
    () => getVisibleNotebooks(archived.data, searchTerm, sort, language),
    [archived.data, searchTerm, sort, language],
  )
  const isSearching = searchTerm.trim().length > 0
  const refresh = () => {
    void Promise.all([active.refetch(), archived.refetch()])
  }
  const refreshing = active.isFetching || archived.isFetching

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-7 sm:px-8 sm:py-10 lg:px-10">
          <section
            className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end"
            aria-labelledby="library-title"
          >
            <div>
              <p className="mb-3 text-xs font-medium tracking-[0.14em] text-primary">
                {t('workspace.libraryEyebrow')}
              </p>
              <h1
                id="library-title"
                className="research-title text-4xl sm:text-5xl"
              >
                {t('notebooks.title')}
              </h1>
              <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
                {t('workspace.libraryDescription')}
              </p>
            </div>
            <Button size="lg" onClick={() => setCreateDialogOpen(true)}>
              <Plus />
              {t('notebooks.newNotebook')}
            </Button>
          </section>

          <section
            aria-label={t('workspace.researchWorkspace')}
            className="grid overflow-hidden rounded-xl border bg-card md:grid-cols-3"
          >
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="group flex items-center gap-3 p-4 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <BookOpen className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {t('workspace.connectTitle')}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {t('workspace.connectDescription')}
                </span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </button>
            <button
              onClick={openSourceDialog}
              className="group flex items-center gap-3 border-t p-4 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:border-l md:border-t-0 sm:p-5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <FileText className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {t('workspace.collectTitle')}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {t('workspace.collectDescription')}
                </span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </button>
            <Link
              href="/search"
              className="group flex items-center gap-3 border-t p-4 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:border-l md:border-t-0 sm:p-5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <MessageSquare className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {t('workspace.understandTitle')}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {t('workspace.understandDescription')}
                </span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            </Link>
          </section>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="notebook-search"
                  name="notebook-search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('workspace.searchPlaceholder')}
                  autoComplete="off"
                  aria-label={t('common.accessibility.searchNotebooks')}
                  className="h-10 bg-card pl-9 pr-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 size-8"
                    aria-label={t('workspace.clearSearch')}
                    onClick={() => {
                      setSearchTerm('')
                      document.getElementById('notebook-search')?.focus()
                    }}
                  >
                    <X />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="notebook-sort" className="sr-only">
                  {t('workspace.sortLabel')}
                </label>
                <select
                  id="notebook-sort"
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as NotebookSort)
                  }
                  className="h-10 max-w-44 rounded-md border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="updated">
                    {t('workspace.recentlyUpdated')}
                  </option>
                  <option value="name">{t('common.name')}</option>
                </select>
                <div
                  className="flex items-center rounded-md border bg-card p-1"
                  role="group"
                  aria-label={t('workspace.viewLabel')}
                >
                  <Button
                    variant={viewMode === 'tile' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="size-8"
                    onClick={() => setViewMode('tile')}
                    aria-label={t('notebooks.tileView')}
                    aria-pressed={viewMode === 'tile'}
                  >
                    <LayoutGrid />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="size-8"
                    onClick={() => setViewMode('list')}
                    aria-label={t('notebooks.listView')}
                    aria-pressed={viewMode === 'list'}
                  >
                    <List />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('common.refresh')}
                  disabled={refreshing}
                  onClick={refresh}
                >
                  <RefreshCw className={refreshing ? 'animate-spin' : ''} />
                </Button>
              </div>
            </div>

            {active.error ? (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-3 rounded-xl border p-5"
              >
                <AlertCircle className="size-5 text-destructive" />
                <p className="flex-1 text-sm">{t('workspace.loadError')}</p>
                <Button variant="outline" onClick={refresh}>
                  {t('common.retry')}
                </Button>
              </div>
            ) : (
              <NotebookList
                notebooks={filteredActive}
                isLoading={active.isLoading}
                title={t('notebooks.activeNotebooks')}
                emptyTitle={
                  isSearching
                    ? t('common.noMatches')
                    : t('workspace.emptyTitle')
                }
                emptyDescription={
                  isSearching
                    ? t('common.tryDifferentSearch')
                    : t('workspace.emptyDescription')
                }
                onAction={
                  isSearching
                    ? () => setSearchTerm('')
                    : () => setCreateDialogOpen(true)
                }
                actionLabel={
                  isSearching
                    ? t('workspace.clearSearch')
                    : t('notebooks.newNotebook')
                }
              />
            )}
            {archived.error && (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm"
              >
                <span className="flex-1">
                  {t('workspace.archiveLoadError')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => archived.refetch()}
                >
                  {t('common.retry')}
                </Button>
              </div>
            )}
            {(archived.data?.length ?? 0) > 0 && (
              <NotebookList
                notebooks={filteredArchived}
                isLoading={archived.isLoading}
                title={t('notebooks.archivedNotebooks')}
                collapsible
                forceExpanded={isSearching}
                emptyTitle={t('common.noMatches')}
                emptyDescription={t('common.tryDifferentSearch')}
              />
            )}
          </div>
        </div>
      </div>
      <CreateNotebookDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </AppShell>
  )
}
