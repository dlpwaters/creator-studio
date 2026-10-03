'use client'

import { useState, useMemo } from 'react'
import { NoteResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, StickyNote, Bot, User, MoreVertical, Trash2, ListChecks, ChevronDown } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { NoteEditorDialog } from './NoteEditorDialog'
import { getDateLocale } from '@/lib/utils/date-locale'
import { formatDistanceToNow } from 'date-fns'
import { ContextToggle } from '@/components/common/ContextToggle'
import { ContextMode } from '../[id]/page'
import type { NoteContextDefault } from '@/lib/utils/source-context'
import { useDeleteNote } from '@/lib/hooks/use-notes'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CollapsibleColumn, createCollapseButton } from '@/components/notebooks/CollapsibleColumn'
import { useNotebookColumnsStore } from '@/lib/stores/notebook-columns-store'
import { useTranslation } from '@/lib/hooks/use-translation'

interface NotesColumnProps {
  notes?: NoteResponse[]
  isLoading: boolean
  notebookId: string
  contextSelections?: Record<string, ContextMode>
  onContextModeChange?: (noteId: string, mode: ContextMode) => void
  onBulkContextModeChange?: (action: NoteContextDefault) => void
}

export function NotesColumn({
  notes,
  isLoading,
  notebookId,
  contextSelections,
  onContextModeChange,
  onBulkContextModeChange
}: NotesColumnProps) {
  const { t, language } = useTranslation()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteResponse | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  const deleteNote = useDeleteNote()

  // Collapsible column state
  const { notesCollapsed, toggleNotes } = useNotebookColumnsStore()
  const collapseButton = useMemo(
    () => createCollapseButton(toggleNotes, t('common.notes')),
    [toggleNotes, t]
  )

  const handleDeleteClick = (noteId: string) => {
    setNoteToDelete(noteId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return

    try {
      await deleteNote.mutateAsync(noteToDelete)
      setDeleteDialogOpen(false)
      setNoteToDelete(null)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  return (
    <>
      <CollapsibleColumn
        isCollapsed={notesCollapsed}
        onToggle={toggleNotes}
        collapsedIcon={StickyNote}
        collapsedLabel={t('common.notes')}
      >
        <Card className="workspace-panel h-full flex min-h-0 flex-1 flex-col gap-3 overflow-hidden py-4">
          <CardHeader className="shrink-0 px-4 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle role="heading" aria-level={2} className="text-base">{t('common.notes')}</CardTitle>
              <div className="flex items-center gap-2">
                {onBulkContextModeChange && notes && notes.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" title={t('sources.bulkContext')}>
                        <ListChecks className="h-4 w-4" />
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onBulkContextModeChange('include')}>
                        {t('sources.includeAllInContext')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onBulkContextModeChange('exclude')}>
                        {t('sources.excludeAllFromContext')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingNote(null)
                    setShowAddDialog(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('common.writeNote')}
                </Button>
                {collapseButton}
              </div>
            </div>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 overflow-y-auto px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : !notes || notes.length === 0 ? (
              <EmptyState
                icon={StickyNote}
                title={t('notebooks.noNotesYet')}
                description={t('sources.createFirstNote')}
              />
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 border rounded-lg card-hover group relative cursor-pointer"
                    onClick={() => setEditingNote(note)}
                  >
                    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {note.note_type === 'ai' ? (
                          <Bot className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {note.note_type === 'ai' ? t('common.aiGenerated') : t('common.human')}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(note.updated), { 
                            addSuffix: true,
                            locale: getDateLocale(language)
                          })}
                        </span>

                        {/* Context toggle - only show if handler provided */}
                        {onContextModeChange && contextSelections?.[note.id] && (
                          <div onClick={(event) => event.stopPropagation()}>
                            <ContextToggle
                              mode={contextSelections[note.id]}
                              hasInsights={false}
                              onChange={(mode) => onContextModeChange(note.id, mode)}
                            />
                          </div>
                        )}

                        {/* Ellipsis menu for delete action */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-label={t('common.actions')}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(note.id)
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('notebooks.deleteNote')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <h3 className="mb-2 text-sm font-medium break-words"><button className="w-full rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={(event) => { event.stopPropagation(); setEditingNote(note) }}>{note.title || t('common.note')}</button></h3>

                    {note.content && (
                      <p className="text-sm text-muted-foreground line-clamp-3 break-all">
                        {note.content}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </CollapsibleColumn>

      <NoteEditorDialog
        open={showAddDialog || Boolean(editingNote)}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setEditingNote(null)
          } else {
            setShowAddDialog(true)
          }
        }}
        notebookId={notebookId}
        note={editingNote ?? undefined}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('notebooks.deleteNote')}
        description={t('notebooks.deleteNoteConfirm')}
        confirmText={t('common.delete')}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteNote.isPending}
        confirmVariant="destructive"
      />
    </>
  )
}
