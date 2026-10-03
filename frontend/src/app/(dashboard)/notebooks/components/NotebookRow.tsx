'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NotebookResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Trash2,
  FileText,
  StickyNote,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateNotebook } from '@/lib/hooks/use-notebooks'
import { NotebookDeleteDialog } from './NotebookDeleteDialog'
import { useState } from 'react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getDateLocale } from '@/lib/utils/date-locale'

interface NotebookRowProps {
  notebook: NotebookResponse
}

export function NotebookRow({ notebook }: NotebookRowProps) {
  const { t, language } = useTranslation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()
  const updateNotebook = useUpdateNotebook()

  const handleArchiveToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateNotebook.mutate({
      id: notebook.id,
      data: { archived: !notebook.archived },
    })
  }

  const handleRowClick = () => {
    router.push(`/notebooks/${encodeURIComponent(notebook.id)}`)
  }

  return (
    <>
      {/* The row is mouse-clickable for convenience, but the notebook name is
          the accessible primary action (a real link) for keyboard/screen-reader
          users — avoiding nested interactive (button-in-button) semantics. */}
      <div
        className="group flex items-center relative flex-wrap gap-3 rounded-lg border bg-card px-4 py-4 card-hover sm:flex-nowrap"
        onClick={handleRowClick}
      >
        <div className="flex-1 min-w-32">
          <div className="flex items-center gap-2">
            <Link
              href={`/notebooks/${encodeURIComponent(notebook.id)}`}
              onClick={(e) => e.stopPropagation()}
              className="font-medium truncate rounded-sm outline-none group-hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring"
            >
              {notebook.name}
            </Link>
            {notebook.archived && (
              <Badge variant="secondary">{t('notebooks.archived')}</Badge>
            )}
          </div>
          {notebook.description && (
            <p className="text-sm text-muted-foreground truncate">
              {notebook.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className="text-xs flex items-center gap-1.5 border-0 bg-muted px-2 py-1 text-muted-foreground"
          >
            <FileText className="h-3 w-3" />
            <span className="sr-only">{t('navigation.sources')}: </span>
            <span className="tabular-nums">{notebook.source_count}</span>
          </Badge>
          <Badge
            variant="outline"
            className="text-xs flex items-center gap-1.5 border-0 bg-muted px-2 py-1 text-muted-foreground"
          >
            <StickyNote className="h-3 w-3" />
            <span className="sr-only">{t('common.notes')}: </span>
            <span className="tabular-nums">{notebook.note_count}</span>
          </Badge>
        </div>

        <div className="hidden sm:block w-40 shrink-0 text-right text-xs text-muted-foreground">
          {t('common.updated').replace(
            '{time}',
            formatDistanceToNow(new Date(notebook.updated), {
              addSuffix: true,
              locale: getDateLocale(language),
            }),
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={`${t('common.actions')}: ${notebook.name}`}
              variant="ghost"
              size="sm"
              className="text-muted-foreground shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={handleArchiveToggle}>
              {notebook.archived ? (
                <>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  {t('notebooks.unarchive')}
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  {t('notebooks.archive')}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteDialog(true)
              }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <NotebookDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        notebookId={notebook.id}
        notebookName={notebook.name}
      />
    </>
  )
}
