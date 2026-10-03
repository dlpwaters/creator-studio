'use client'

import { useId, useState } from 'react'
import type { NotebookResponse } from '@/lib/types/api'
import { NotebookCard } from './NotebookCard'
import { NotebookRow } from './NotebookRow'
import { useNotebookViewStore } from '@/lib/stores/notebook-view-store'
import { EmptyState } from '@/components/common/EmptyState'
import { BookOpen, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'

interface NotebookListProps {
  notebooks?: NotebookResponse[]
  isLoading: boolean
  title: string
  collapsible?: boolean
  forceExpanded?: boolean
  emptyTitle?: string
  emptyDescription?: string
  onAction?: () => void
  actionLabel?: string
}

export function NotebookList({
  notebooks,
  isLoading,
  title,
  collapsible = false,
  forceExpanded = false,
  emptyTitle,
  emptyDescription,
  onAction,
  actionLabel,
}: NotebookListProps) {
  const { t } = useTranslation()
  const viewMode = useNotebookViewStore((state) => state.viewMode)
  const [isExpanded, setIsExpanded] = useState(!collapsible)
  const contentId = useId()
  const expanded = forceExpanded || isExpanded

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {collapsible ? (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 gap-2"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={expanded}
            aria-controls={contentId}
            disabled={forceExpanded}
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            <h2 className="text-sm font-semibold">{title}</h2>
          </Button>
        ) : (
          <h2 className="text-sm font-semibold">{title}</h2>
        )}
        {!isLoading && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {notebooks?.length ?? 0}
          </span>
        )}
      </div>
      {expanded && (
        <div id={contentId}>
          {isLoading ? (
            <div
              role="status"
              aria-label={t('common.loading')}
              className={viewMode === 'list' ? 'space-y-2' : 'notebook-grid'}
            >
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={`animate-pulse rounded-xl border bg-card p-5 ${viewMode === 'list' ? 'h-20' : 'h-52'}`}
                  aria-hidden="true"
                >
                  <div className="h-4 w-1/2 rounded bg-muted" />
                  <div className="mt-5 h-3 w-3/4 rounded bg-muted" />
                  <div className="mt-3 h-3 w-1/3 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : !notebooks?.length ? (
            <div className="rounded-xl border border-dashed bg-card/50 py-8">
              <EmptyState
                icon={BookOpen}
                title={emptyTitle ?? t('common.noResults')}
                description={emptyDescription ?? t('chat.startByCreating')}
                action={
                  onAction && actionLabel ? (
                    <Button
                      onClick={onAction}
                      variant="outline"
                      className="mt-4"
                    >
                      {!forceExpanded && <Plus className="size-4" />}
                      {actionLabel}
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-2">
              {notebooks.map((notebook) => (
                <NotebookRow key={notebook.id} notebook={notebook} />
              ))}
            </div>
          ) : (
            <div className="notebook-grid">
              {notebooks.map((notebook) => (
                <NotebookCard key={notebook.id} notebook={notebook} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
