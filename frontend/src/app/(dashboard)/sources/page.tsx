'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { sourcesApi } from '@/lib/api/sources'
import { SourceListResponse } from '@/lib/types/api'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { AppShell } from '@/components/layout/AppShell'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FileText, Link as LinkIcon, Upload, AlignLeft, Trash2, ArrowUpDown, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getDateLocale } from '@/lib/utils/date-locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getApiErrorKey } from '@/lib/utils/error-handler'
import { useCreateDialogs } from '@/lib/hooks/use-create-dialogs'

export default function SourcesPage() {
  const { t, language } = useTranslation()
  const { openSourceDialog } = useCreateDialogs()
  const [sources, setSources] = useState<SourceListResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [sortBy, setSortBy] = useState<'created' | 'updated'>('updated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; source: SourceListResponse | null }>({
    open: false,
    source: null
  })
  const router = useRouter()
  const tableRef = useRef<HTMLTableElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(true)
  const requestVersionRef = useRef(0)
  const PAGE_SIZE = 30

  const fetchSources = useCallback(async (reset = false) => {
    if (!reset && (loadingMoreRef.current || !hasMoreRef.current)) return
    if (reset) requestVersionRef.current += 1
    const requestVersion = requestVersionRef.current
    loadingMoreRef.current = true
    try {
      if (reset) {
        setError(null)
        setLoading(true)
        setSelectedIndex(0)
        offsetRef.current = 0
        setSources([])
        hasMoreRef.current = true
      } else {
        setError(null)
        loadingMoreRef.current = true
        setLoadingMore(true)
      }

      const data = await sourcesApi.list({
        limit: PAGE_SIZE,
        offset: offsetRef.current,
        sort_by: sortBy,
        sort_order: sortOrder,
      })

      // A sort change may have started another request while this page loaded.
      if (requestVersion !== requestVersionRef.current) return

      if (reset) {
        setSources(data)
      } else {
        setSources(prev => [...prev, ...data])
      }

      // Check if we have more data
      const hasMoreData = data.length === PAGE_SIZE
      hasMoreRef.current = hasMoreData
      offsetRef.current += data.length
    } catch (err) {
      if (requestVersion !== requestVersionRef.current) return
      console.error('Failed to fetch sources:', err)
      setError(t('sources.failedToLoad'))
      toast.error(t('sources.failedToLoad'))
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setLoading(false)
        setLoadingMore(false)
        loadingMoreRef.current = false
      }
    }
  }, [sortBy, sortOrder, t])

  // Initial load and when sort changes
  useEffect(() => {
    fetchSources(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder])

  const handleTableKeyDown = (e: React.KeyboardEvent<HTMLTableElement>) => {
      // Links, sort buttons, and dialogs keep their own native keyboard behavior.
      if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (sources.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => {
            const newIndex = Math.min(prev + 1, sources.length - 1)
            // Scroll to keep selected row visible
            setTimeout(() => scrollToSelectedRow(newIndex), 0)
            return newIndex
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => {
            const newIndex = Math.max(prev - 1, 0)
            // Scroll to keep selected row visible
            setTimeout(() => scrollToSelectedRow(newIndex), 0)
            return newIndex
          })
          break
        case 'Enter':
          e.preventDefault()
          if (sources[selectedIndex]) {
            router.push(`/sources/${sources[selectedIndex].id}`)
          }
          break
        case 'Home':
          e.preventDefault()
          setSelectedIndex(0)
          setTimeout(() => scrollToSelectedRow(0), 0)
          break
        case 'End':
          e.preventDefault()
          const lastIndex = sources.length - 1
          setSelectedIndex(lastIndex)
          setTimeout(() => scrollToSelectedRow(lastIndex), 0)
          break
      }
  }

  const scrollToSelectedRow = (index: number) => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    // Find the selected row element
    const rows = scrollContainer.querySelectorAll('tbody tr')
    const selectedRow = rows[index] as HTMLElement
    if (!selectedRow) return

    const containerRect = scrollContainer.getBoundingClientRect()
    const rowRect = selectedRow.getBoundingClientRect()

    // Check if row is above visible area
    if (rowRect.top < containerRect.top) {
      selectedRow.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // Check if row is below visible area
    else if (rowRect.bottom > containerRect.bottom) {
      selectedRow.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  // Set up scroll listener after sources are loaded
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    let scrollTimeout: NodeJS.Timeout | null = null

    const handleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }

      scrollTimeout = setTimeout(() => {
        if (!scrollContainerRef.current) return

        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight

        // Load more when within 200px of the bottom
        if (distanceFromBottom < 200 && !loadingMoreRef.current && hasMoreRef.current) {
          fetchSources(false)
        }
      }, 100)
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    handleScroll() // Check on mount

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [fetchSources, sources.length])

  const toggleSort = (field: 'created' | 'updated') => {
    if (sortBy === field) {
      // Toggle order if clicking the same field
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // Switch to new field with default desc order
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const getSourceIcon = (source: SourceListResponse) => {
    if (source.asset?.url) return <LinkIcon className="h-4 w-4" />
    if (source.asset?.file_path) return <Upload className="h-4 w-4" />
    return <AlignLeft className="h-4 w-4" />
  }

  const getSourceType = (source: SourceListResponse) => {
    if (source.asset?.url) return t('sources.type.link')
    if (source.asset?.file_path) return t('sources.type.file')
    return t('sources.type.text')
  }

  const handleRowClick = useCallback((index: number, sourceId: string) => {
    setSelectedIndex(index)
    router.push(`/sources/${sourceId}`)
  }, [router])

  const handleDeleteClick = useCallback((e: React.MouseEvent, source: SourceListResponse) => {
    e.stopPropagation() // Prevent row click
    setDeleteDialog({ open: true, source })
  }, [])

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.source) return

    try {
      await sourcesApi.delete(deleteDialog.source.id)
      toast.success(t('sources.deleteSuccess'))
      // Remove the deleted source from the list
      setSources(prev => prev.filter(s => s.id !== deleteDialog.source?.id))
      offsetRef.current = Math.max(0, offsetRef.current - 1)
      setSelectedIndex(prev => Math.max(0, Math.min(prev, sources.length - 2)))
      setDeleteDialog({ open: false, source: null })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }, message?: string };
      console.error('Failed to delete source:', error)
      toast.error(t(getApiErrorKey(error.response?.data?.detail || error.message)))
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      </AppShell>
    )
  }

  if (error && sources.length === 0) {
    return (
      <AppShell>
        <div role="alert" className="flex h-full flex-col items-center justify-center gap-4 p-6">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => fetchSources(true)}>{t('common.retry')}</Button>
        </div>
      </AppShell>
    )
  }

  if (sources.length === 0) {
    return (
      <AppShell>
        <EmptyState
          icon={FileText}
          title={t('sources.noSourcesYet')}
          description={t('sources.allSourcesDescShort')}
          action={<Button onClick={openSourceDialog}><Plus className="size-4" />{t('sources.add')}</Button>}
        />
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col px-4 py-7 sm:px-8 sm:py-10 lg:px-10">
        <div className="mb-6 flex shrink-0 flex-wrap items-end justify-between gap-4">
          <div><h1 className="research-title text-4xl">{t('sources.allSources')}</h1>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
            {t('sources.allSourcesDesc')}
          </p></div>
          <Button onClick={openSourceDialog}><Plus className="size-4" />{t('sources.add')}</Button>
        </div>

        <div ref={scrollContainerRef} className="flex-1 rounded-md border overflow-auto">
          <table
            ref={tableRef}
            tabIndex={0}
            onKeyDown={handleTableKeyDown}
            aria-label={t('sources.allSources')}
            className="w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b bg-muted/50">
                <th className="hidden h-12 w-28 px-4 text-left align-middle font-medium text-muted-foreground sm:table-cell">
                  {t('common.type')}
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  {t('common.title')}
                </th>
                <th className="h-12 w-40 px-4 text-left align-middle font-medium text-muted-foreground hidden md:table-cell">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('created')}
                    className="h-8 px-2 hover:bg-muted"
                  >
                    {t('common.created_label')}
                    <ArrowUpDown className={cn(
                      "ml-2 h-3 w-3",
                      sortBy === 'created' ? 'opacity-100' : 'opacity-30'
                    )} />
                    {sortBy === 'created' && (
                      <span className="ml-1 text-xs">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </Button>
                </th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground hidden md:table-cell">
                  {t('sources.insights')}
                </th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground hidden lg:table-cell">
                  {t('sources.embedded')}
                </th>
                <th className="h-12 w-16 px-3 text-right align-middle font-medium text-muted-foreground sm:w-24">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source, index) => (
                <tr
                  key={source.id}
                  onClick={() => handleRowClick(index, source.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "border-b transition-colors cursor-pointer",
                    selectedIndex === index
                      ? "bg-accent"
                      : "hover:bg-muted/50"
                  )}
                >
                  <td className="hidden h-12 px-4 sm:table-cell">
                    <div className="flex items-center gap-2">
                      {getSourceIcon(source)}
                      <Badge variant="secondary" className="text-xs">
                        {getSourceType(source)}
                      </Badge>
                    </div>
                  </td>
                  <td className="h-12 px-4">
                    <div className="flex flex-col gap-1 py-3">
                      <Link href={`/sources/${encodeURIComponent(source.id)}`} onClick={event => event.stopPropagation()} className="rounded-sm font-medium break-words [overflow-wrap:anywhere] outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
                        {source.title || t('sources.untitledSource')}
                      </Link>
                      <span className="text-xs text-muted-foreground sm:hidden">{getSourceType(source)}</span>
                      {source.asset?.url && (
                        <span className="max-w-prose text-xs text-muted-foreground break-all">
                          {source.asset.url}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="h-12 px-4 text-muted-foreground text-sm hidden md:table-cell">
                    {formatDistanceToNow(new Date(source.created), { 
                      addSuffix: true,
                      locale: getDateLocale(language)
                    })}
                  </td>
                  <td className="h-12 px-4 text-center hidden md:table-cell">
                    <span className="text-sm font-medium">{source.insights_count || 0}</span>
                  </td>
                  <td className="h-12 px-4 text-center hidden lg:table-cell">
                    <Badge variant={source.embedded ? "default" : "secondary"} className="text-xs">
                      {source.embedded ? t('sources.yes') : t('sources.no')}
                    </Badge>
                  </td>
                  <td className="h-12 px-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${t('common.delete')}: ${source.title || t('sources.untitledSource')}`}
                      onClick={(e) => handleDeleteClick(e, source)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {loadingMore && (
                <tr>
                  <td colSpan={6} className="h-16 text-center">
                    <div className="flex items-center justify-center">
                      <LoadingSpinner />
                      <span className="ml-2 text-muted-foreground">{t('sources.loadingMore')}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {error && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => fetchSources(false)}>{t('common.retry')}</Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, source: deleteDialog.source })}
        title={t('sources.delete')}
        description={t('sources.deleteConfirmWithTitle').replace('{title}', deleteDialog.source?.title || t('sources.untitledSource'))}
        confirmText={t('common.delete')}
        confirmVariant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </AppShell>
  )
}
