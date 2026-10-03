import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotebooksPage from './page'
import type { NotebookResponse } from '@/lib/types/api'

const { active, archived } = vi.hoisted(() => ({
  active: {
    data: [] as NotebookResponse[],
    error: null as Error | null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  archived: {
    data: [] as NotebookResponse[],
    error: null as Error | null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  },
}))

vi.mock('@/lib/hooks/use-notebooks', () => ({
  useNotebooks: (isArchived: boolean) => (isArchived ? archived : active),
}))
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/notebooks/CreateNotebookDialog', () => ({
  CreateNotebookDialog: () => null,
}))
vi.mock('./components/NotebookCard', () => ({
  NotebookCard: ({ notebook }: { notebook: NotebookResponse }) => (
    <a href={`/notebooks/${notebook.id}`}>{notebook.name}</a>
  ),
}))
vi.mock('./components/NotebookRow', () => ({
  NotebookRow: ({ notebook }: { notebook: NotebookResponse }) => (
    <a href={`/notebooks/${notebook.id}`}>{notebook.name}</a>
  ),
}))

describe('notebook library states', () => {
  beforeEach(() => {
    active.data = []
    archived.data = []
    active.error = null
    archived.error = null
    active.isLoading = false
    active.refetch.mockClear()
    archived.refetch.mockClear()
  })

  it('shows a recoverable error instead of an empty library after a failed request', () => {
    active.error = new Error('offline')
    render(<NotebooksPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('workspace.loadError')
    expect(screen.queryByText('workspace.emptyTitle')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }))
    expect(active.refetch).toHaveBeenCalledOnce()
    expect(archived.refetch).toHaveBeenCalledOnce()
  })

  it('finds and expands an archived notebook by its description', () => {
    archived.data = [
      {
        id: 'notebook:archived',
        name: 'Field notes',
        description: 'coastal ecology',
        archived: true,
        created: '2026-01-01',
        updated: '2026-02-01',
        source_count: 0,
        note_count: 0,
      },
    ]
    render(<NotebooksPage />)
    expect(screen.queryByRole('link', { name: 'Field notes' })).toBeNull()
    fireEvent.change(
      screen.getByRole('textbox', {
        name: 'common.accessibility.searchNotebooks',
      }),
      { target: { value: 'coastal' } },
    )
    expect(screen.getByRole('link', { name: 'Field notes' })).toBeVisible()
  })

  it('keeps loading separate from the getting-started state', () => {
    active.isLoading = true
    render(<NotebooksPage />)
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'common.loading',
    )
    expect(screen.queryByText('workspace.emptyTitle')).toBeNull()
  })
})
