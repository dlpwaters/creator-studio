'use client'

import Link from 'next/link'
import { NotebookResponse } from '@/lib/types/api'
import { CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Trash2,
  FileText,
  StickyNote,
  BookOpen,
  ArrowUpRight,
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
interface NotebookCardProps {
  notebook: NotebookResponse
}

export function NotebookCard({ notebook }: NotebookCardProps) {
  const { t, language } = useTranslation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const updateNotebook = useUpdateNotebook()

  const handleArchiveToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateNotebook.mutate({
      id: notebook.id,
      data: { archived: !notebook.archived },
    })
  }

  return (
    <>
      <article className="group card-hover relative flex h-full flex-col rounded-xl border bg-card py-5">
        <div
          className="mb-4 flex items-center justify-between px-5"
          aria-hidden="true"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
            <BookOpen className="size-5" />
          </span>
          <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </div>
        <CardHeader className="px-5 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold leading-snug tracking-tight">
                <Link
                  href={`/notebooks/${encodeURIComponent(notebook.id)}`}
                  className="line-clamp-2 rounded-xl outline-none after:absolute after:inset-0 after:rounded-xl group-hover:text-primary focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2"
                >
                  {notebook.name}
                </Link>
              </h3>
              {notebook.archived && (
                <Badge variant="secondary" className="mt-1">
                  {t('notebooks.archived')}
                </Badge>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`${t('common.actions')}: ${notebook.name}`}
                  className="relative z-10 -mr-2 text-muted-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
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
        </CardHeader>

        <CardContent className="flex flex-1 flex-col px-5">
          <CardDescription className="mb-5 line-clamp-2 text-sm leading-relaxed">
            {notebook.description || t('chat.noDescription')}
          </CardDescription>

          <div className="mt-auto text-xs text-muted-foreground">
            {t('common.updated').replace(
              '{time}',
              formatDistanceToNow(new Date(notebook.updated), {
                addSuffix: true,
                locale: getDateLocale(language),
              }),
            )}
          </div>

          {/* Item counts footer */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              <span>{t('navigation.sources')}</span>
              <span className="font-medium tabular-nums text-foreground">
                {notebook.source_count}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <StickyNote className="h-3 w-3" />
              <span>{t('common.notes')}</span>
              <span className="font-medium tabular-nums text-foreground">
                {notebook.note_count}
              </span>
            </span>
          </div>
        </CardContent>
      </article>

      <NotebookDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        notebookId={notebook.id}
        notebookName={notebook.name}
      />
    </>
  )
}
