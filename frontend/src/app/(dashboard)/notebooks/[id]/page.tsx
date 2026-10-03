'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { NotebookHeader } from '../components/NotebookHeader'
import { SourcesColumn } from '../components/SourcesColumn'
import { NotesColumn } from '../components/NotesColumn'
import { ChatColumn } from '../components/ChatColumn'
import { useNotebook } from '@/lib/hooks/use-notebooks'
import { useNotebookSources } from '@/lib/hooks/use-sources'
import { useNotes } from '@/lib/hooks/use-notes'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useNotebookColumnsStore } from '@/lib/stores/notebook-columns-store'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import { useTranslation } from '@/lib/hooks/use-translation'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FileText, StickyNote, MessageSquare } from 'lucide-react'
import {
  applyBulkSourceContext,
  applyBulkNoteContext,
  computeSourceSelections,
  computeNoteSelections,
  type SourceContextDefault,
  type SourceBulkAction,
  type NoteContextDefault,
} from '@/lib/utils/source-context'

// Re-exported from the shared types module for backward compatibility; several
// components historically import these from this route file.
import type {
  ContextMode,
  ContextSelections,
} from '@/lib/types/notebook-context'
export type { ContextMode, ContextSelections }

export default function NotebookPage() {
  const { t } = useTranslation()
  const params = useParams()

  // Ensure the notebook ID is properly decoded from URL
  const notebookId = params?.id ? decodeURIComponent(params.id as string) : ''

  const { data: notebook, isLoading: notebookLoading } = useNotebook(notebookId)
  const {
    sources,
    isLoading: sourcesLoading,
    refetch: refetchSources,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotebookSources(notebookId)
  const { data: notes, isLoading: notesLoading } = useNotes(notebookId)

  // Get collapse states for dynamic layout
  const { sourcesCollapsed, notesCollapsed } = useNotebookColumnsStore()

  // Detect desktop to avoid double-mounting ChatColumn
  const isDesktop = useMediaQuery('(min-width: 1280px)')

  // Mobile tab state (Sources, Notes, or Chat)
  const [mobileActiveTab, setMobileActiveTab] = useState<
    'sources' | 'notes' | 'chat'
  >('chat')

  // Context selection state
  const [contextSelections, setContextSelections] = useState<ContextSelections>(
    {
      sources: {},
      notes: {},
    },
  )

  // The default context mode applied to sources as they load. A bulk
  // include/exclude updates this so sources loaded later via pagination follow
  // the same intent instead of reverting to "included" (#223/#915).
  const [sourceContextDefault, setSourceContextDefault] =
    useState<SourceContextDefault>('include')

  // Same idea for notes loaded later (notes are binary: included/off).
  const [noteContextDefault, setNoteContextDefault] =
    useState<NoteContextDefault>('include')

  // Initialize and update selections when sources load or change
  useEffect(() => {
    if (sources && sources.length > 0) {
      setContextSelections((prev) => ({
        ...prev,
        sources: computeSourceSelections(
          prev.sources,
          sources,
          sourceContextDefault,
        ),
      }))
    }
  }, [sources, sourceContextDefault])

  useEffect(() => {
    if (notes && notes.length > 0) {
      setContextSelections((prev) => ({
        ...prev,
        notes: computeNoteSelections(prev.notes, notes, noteContextDefault),
      }))
    }
  }, [notes, noteContextDefault])

  // Handler to update context selection
  const handleContextModeChange = (
    itemId: string,
    mode: ContextMode,
    type: 'source' | 'note',
  ) => {
    setContextSelections((prev) => ({
      ...prev,
      [type === 'source' ? 'sources' : 'notes']: {
        ...(type === 'source' ? prev.sources : prev.notes),
        [itemId]: mode,
      },
    }))
  }

  // Bulk-apply a context action (insights-only / full / exclude) to every
  // source at once (#223). Also records the action as the default for sources
  // loaded later (#915).
  const handleBulkSourceContext = (action: SourceBulkAction) => {
    setSourceContextDefault(action)
    setContextSelections((prev) => ({
      ...prev,
      sources: applyBulkSourceContext(prev.sources, sources ?? [], action),
    }))
  }

  // Bulk include/exclude every note from the chat context at once (#223).
  const handleBulkNoteContext = (action: NoteContextDefault) => {
    setNoteContextDefault(action)
    setContextSelections((prev) => ({
      ...prev,
      notes: applyBulkNoteContext(prev.notes, notes ?? [], action),
    }))
  }

  if (notebookLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!notebook) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">{t('notebooks.notFound')}</h1>
          <p className="text-muted-foreground">{t('notebooks.notFoundDesc')}</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 px-4 pt-5 sm:px-6">
          <NotebookHeader notebook={notebook} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6">
          {/* Mobile: Tabbed interface - only render on mobile to avoid double-mounting */}
          {!isDesktop && (
            <>
              <Tabs
                className="flex min-h-0 flex-1 flex-col gap-4 xl:hidden"
                value={mobileActiveTab}
                onValueChange={(value) =>
                  setMobileActiveTab(value as 'sources' | 'notes' | 'chat')
                }
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="sources" className="gap-2">
                    <FileText className="h-4 w-4" />
                    {t('navigation.sources')}
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="gap-2">
                    <StickyNote className="h-4 w-4" />
                    {t('common.notes')}
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {t('common.chat')}
                  </TabsTrigger>
                </TabsList>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <TabsContent value="sources" className="mt-0 h-full min-h-0">
                    <SourcesColumn
                      sources={sources}
                      isLoading={sourcesLoading}
                      notebookId={notebookId}
                      notebookName={notebook?.name}
                      onRefresh={refetchSources}
                      contextSelections={contextSelections.sources}
                      onContextModeChange={(sourceId, mode) =>
                        handleContextModeChange(sourceId, mode, 'source')
                      }
                      onBulkContextModeChange={handleBulkSourceContext}
                      hasNextPage={hasNextPage}
                      isFetchingNextPage={isFetchingNextPage}
                      fetchNextPage={fetchNextPage}
                    />
                  </TabsContent>
                  <TabsContent value="notes" className="mt-0 h-full min-h-0">
                    <NotesColumn
                      notes={notes}
                      isLoading={notesLoading}
                      notebookId={notebookId}
                      contextSelections={contextSelections.notes}
                      onContextModeChange={(noteId, mode) =>
                        handleContextModeChange(noteId, mode, 'note')
                      }
                      onBulkContextModeChange={handleBulkNoteContext}
                    />
                  </TabsContent>
                  <TabsContent value="chat" className="mt-0 h-full min-h-0">
                    <ChatColumn
                      notebookId={notebookId}
                      contextSelections={contextSelections}
                      sources={sources}
                      sourcesLoading={sourcesLoading}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}

          {/* Desktop: Collapsible columns layout */}
          {isDesktop && (
            <div className="hidden min-h-0 flex-1 gap-4 xl:flex">
              {/* Sources Column */}
              <div
                className={cn(
                  'min-w-0',
                  sourcesCollapsed ? 'w-12 shrink-0' : 'flex-1',
                )}
              >
                <SourcesColumn
                  sources={sources}
                  isLoading={sourcesLoading}
                  notebookId={notebookId}
                  notebookName={notebook?.name}
                  onRefresh={refetchSources}
                  contextSelections={contextSelections.sources}
                  onContextModeChange={(sourceId, mode) =>
                    handleContextModeChange(sourceId, mode, 'source')
                  }
                  onBulkContextModeChange={handleBulkSourceContext}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                />
              </div>

              {/* Chat Column - always expanded, takes remaining space */}
              <div className="min-w-0 flex-[1.5]">
                <ChatColumn
                  notebookId={notebookId}
                  contextSelections={contextSelections}
                  sources={sources}
                  sourcesLoading={sourcesLoading}
                />
              </div>
              {/* Notes Column */}
              <div
                className={cn(
                  'min-w-0',
                  notesCollapsed ? 'w-12 shrink-0' : 'flex-1',
                )}
              >
                <NotesColumn
                  notes={notes}
                  isLoading={notesLoading}
                  notebookId={notebookId}
                  contextSelections={contextSelections.notes}
                  onContextModeChange={(noteId, mode) =>
                    handleContextModeChange(noteId, mode, 'note')
                  }
                  onBulkContextModeChange={handleBulkNoteContext}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
