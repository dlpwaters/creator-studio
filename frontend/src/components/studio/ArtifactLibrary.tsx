'use client'

import { useEffect, useId, useState } from 'react'
import {
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  FileUp,
  FolderOpen,
  Plus,
  RefreshCw,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStudioLibrary } from '@/lib/hooks/studio'
import { useTranslation } from '@/lib/hooks/use-translation'
import type {
  StudioArtifactSummary,
  StudioKind,
  StudioLibraryQuery
} from '@/lib/types/studio'
import { studioFormats } from './studio-options'
import {
  StudioError,
  StudioSkeleton,
  studioFieldClass
} from './StudioPrimitives'

function displayDate(value: string, language: string): string | undefined {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return undefined
  try {
    return new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(
      date
    )
  } catch {
    return undefined
  }
}

export function ArtifactLibrary({
  notebookId,
  selectedId,
  disabled,
  onSelect,
  onCreate,
  onImport
}: {
  notebookId: string
  selectedId?: string
  disabled: boolean
  onSelect: (summary: StudioArtifactSummary) => void
  onCreate: () => void
  onImport: () => void
}) {
  const { t, language } = useTranslation()
  const controlId = useId()
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<StudioKind | ''>('')
  const [sort, setSort] =
    useState<NonNullable<StudioLibraryQuery['sort']>>('updated')
  const [scope, setScope] =
    useState<NonNullable<StudioLibraryQuery['scope']>>('notebook')
  const [page, setPage] = useState(1)
  useEffect(() => {
    if (searchInput.trim() === query) return
    const timer = setTimeout(() => {
      setQuery(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, query])
  const library = useStudioLibrary(notebookId, {
    scope,
    query: query || undefined,
    kind: kind || undefined,
    sort,
    page,
    page_size: 12
  })
  const data = library.data
  const currentPage = data?.page ?? page
  const pages = Math.max(1, data?.pages ?? 1)
  const hasFilters = !!query || !!kind
  function changeScope() {
    setScope((value) => (value === 'notebook' ? 'orphaned' : 'notebook'))
    setPage(1)
  }
  function clearFilters() {
    setSearchInput('')
    setQuery('')
    setKind('')
    setPage(1)
  }
  return (
    <section
      aria-label={t('studio.library')}
      className="min-w-0 space-y-4"
      aria-busy={library.isFetching}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-medium">{t('studio.library')}</h2>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onCreate}
          >
            <Plus className="size-4" />
            {t('studio.create')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={onImport}
          >
            <FileUp className="size-4" />
            {t('studio.libraryImport')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled || library.isFetching}
            aria-label={t('studio.refresh')}
            onClick={() => void library.refetch()}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </header>
      <fieldset
        disabled={disabled}
        className="grid min-w-0 gap-3 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label
            htmlFor={`${controlId}-search`}
            className="mb-2 block text-xs font-medium text-muted-foreground"
          >
            {t('studio.librarySearch')}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              id={`${controlId}-search`}
              type="search"
              maxLength={200}
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value.slice(0, 200))
              }
              placeholder={t('studio.librarySearchPlaceholder')}
              className={`${studioFieldClass} pl-9`}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor={`${controlId}-kind`}
            className="mb-2 block text-xs font-medium text-muted-foreground"
          >
            {t('studio.libraryFormat')}
          </label>
          <select
            id={`${controlId}-kind`}
            value={kind}
            className={studioFieldClass}
            onChange={(event) => {
              setKind(event.target.value as StudioKind | '')
              setPage(1)
            }}
          >
            <option value="">{t('studio.libraryAllFormats')}</option>
            {studioFormats.map((format) => (
              <option key={format.kind} value={format.kind}>
                {t(format.label)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${controlId}-sort`}
            className="mb-2 block text-xs font-medium text-muted-foreground"
          >
            {t('studio.librarySort')}
          </label>
          <select
            id={`${controlId}-sort`}
            value={sort}
            className={studioFieldClass}
            onChange={(event) => {
              setSort(
                event.target.value as NonNullable<StudioLibraryQuery['sort']>
              )
              setPage(1)
            }}
          >
            <option value="updated">{t('studio.librarySortUpdated')}</option>
            <option value="created">{t('studio.librarySortCreated')}</option>
            <option value="title">{t('studio.librarySortTitle')}</option>
          </select>
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant={scope === 'orphaned' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-auto min-h-8 whitespace-normal text-left"
          disabled={disabled}
          aria-pressed={scope === 'orphaned'}
          onClick={changeScope}
        >
          <ArchiveRestore className="size-4" />
          {t(
            scope === 'orphaned'
              ? 'studio.libraryReturnNotebook'
              : 'studio.libraryRecover'
          )}
        </Button>
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={clearFilters}
          >
            {t('studio.libraryResetFilters')}
          </Button>
        )}
      </div>
      {scope === 'orphaned' && (
        <p className="rounded-lg bg-accent/50 p-3 text-xs leading-relaxed text-muted-foreground">
          {t('studio.libraryRecoveryHelp')}
        </p>
      )}
      <div
        role="status"
        className="min-h-5 text-xs tabular-nums text-muted-foreground"
      >
        {library.isLoading && !data
          ? t('studio.libraryLoading')
          : library.isFetching
            ? t('studio.libraryRefreshing')
            : data
              ? t('studio.libraryResults', {
                  count: data.filtered_total,
                  total: data.total
                })
              : null}
      </div>
      {library.isError && (
        <StudioError
          error={library.error}
          title={t('studio.libraryLoadError')}
          retry={!disabled ? () => void library.refetch() : undefined}
        />
      )}
      {library.isLoading && !data ? (
        <StudioSkeleton />
      ) : data && data.items.length > 0 ? (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-2 sm:gap-3">
          {data.items.map((summary) => {
            const format = studioFormats.find(
              (item) => item.kind === summary.kind
            )
            const Icon = format?.icon ?? FolderOpen
            const updated = displayDate(summary.updated_at, language)
            return (
              <li key={summary.id} className="min-w-0">
                <button
                  type="button"
                  disabled={disabled || library.isFetching}
                  aria-pressed={selectedId === summary.id}
                  onClick={() => onSelect(summary)}
                  className={`flex h-full w-full min-w-0 items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 ${selectedId === summary.id ? 'border-primary bg-accent/50' : 'bg-card hover:bg-muted'}`}
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium leading-relaxed">
                      {summary.title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {format ? t(format.label) : summary.kind} ·{' '}
                      {t('studio.sections', { count: summary.card_count })} ·{' '}
                      {t(
                        summary.generation === 'ai'
                          ? 'studio.aiDraft'
                          : 'studio.sourceExcerpts'
                      )}
                    </span>
                    {updated && (
                      <time
                        dateTime={summary.updated_at}
                        className="mt-2 block text-xs text-muted-foreground"
                      >
                        {t('studio.libraryUpdated', { date: updated })}
                      </time>
                    )}
                    {summary.reference_status === 'snapshot' && (
                      <span className="mt-2 block text-xs leading-relaxed text-primary">
                        {t('studio.librarySavedReferences')}
                      </span>
                    )}
                    {!summary.notebook_available && (
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {t('studio.libraryNotebookUnavailable')}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : data && !library.isError ? (
        <div className="rounded-xl border border-dashed p-6 sm:p-8">
          <FolderOpen className="mb-4 size-6 text-primary" />
          <h3 className="research-title text-2xl">
            {t(
              hasFilters
                ? 'studio.libraryNoMatches'
                : scope === 'orphaned'
                  ? 'studio.libraryOrphanedEmpty'
                  : 'studio.libraryEmpty'
            )}
          </h3>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {t(
              hasFilters
                ? 'studio.libraryNoMatchesHelp'
                : scope === 'orphaned'
                  ? 'studio.libraryOrphanedEmptyHelp'
                  : 'studio.libraryEmptyHelp'
            )}
          </p>
          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              disabled={disabled}
              onClick={clearFilters}
            >
              {t('studio.libraryResetFilters')}
            </Button>
          )}
        </div>
      ) : null}
      {data && data.filtered_total > 0 && (
        <nav
          aria-label={t('studio.libraryPage', { page: currentPage, pages })}
          className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"
        >
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {t('studio.libraryPage', { page: currentPage, pages })}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || library.isFetching || currentPage <= 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
            >
              <ArrowLeft className="size-4" />
              {t('studio.libraryPrevious')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || library.isFetching || currentPage >= pages}
              onClick={() => setPage(Math.min(pages, currentPage + 1))}
            >
              {t('studio.libraryNext')}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </nav>
      )}
    </section>
  )
}
