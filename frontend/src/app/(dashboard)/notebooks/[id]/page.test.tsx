import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import NotebookPage from './page'

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'notebook:test' }),
}))
vi.mock('@/lib/hooks/use-media-query', () => ({ useMediaQuery: vi.fn() }))
vi.mock('@/lib/hooks/use-notebooks', () => ({
  useNotebook: () => ({
    data: { id: 'notebook:test', name: 'Research' },
    isLoading: false,
  }),
}))
vi.mock('@/lib/hooks/use-sources', () => ({
  useNotebookSources: () => ({ sources: [], isLoading: false }),
}))
vi.mock('@/lib/hooks/use-notes', () => ({
  useNotes: () => ({ data: [], isLoading: false }),
}))
vi.mock('@/lib/stores/notebook-columns-store', () => ({
  useNotebookColumnsStore: () => ({
    sourcesCollapsed: false,
    notesCollapsed: false,
  }),
}))
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('../components/NotebookHeader', () => ({
  NotebookHeader: () => <h1>Research</h1>,
}))
vi.mock('../components/SourcesColumn', () => ({
  SourcesColumn: () => <div>Source panel</div>,
}))
vi.mock('../components/NotesColumn', () => ({
  NotesColumn: () => <div>Notes panel</div>,
}))
vi.mock('../components/ChatColumn', () => ({
  ChatColumn: () => <div data-testid="chat-panel">Chat panel</div>,
}))

describe('responsive notebook workspace', () => {
  it.each([true, false])(
    'mounts exactly one chat panel when wide viewport is %s',
    (isWide) => {
      vi.mocked(useMediaQuery).mockReturnValue(isWide)
      render(<NotebookPage />)
      expect(screen.getAllByTestId('chat-panel')).toHaveLength(1)
    },
  )
})
