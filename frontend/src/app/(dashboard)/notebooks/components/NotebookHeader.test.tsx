import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NotebookHeader } from './NotebookHeader'

vi.mock('@/lib/hooks/use-notebooks', () => ({
  useUpdateNotebook: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() })
}))
vi.mock('@/components/common/InlineEdit', () => ({
  InlineEdit: ({ value }: { value: string }) => <span>{value}</span>
}))
vi.mock('./NotebookDeleteDialog', () => ({ NotebookDeleteDialog: () => null }))
vi.mock('@/components/notebooks/ResearchReadiness', () => ({
  ResearchReadiness: ({ notebookId }: { notebookId: string }) => (
    <div data-testid="readiness">{notebookId}</div>
  )
}))

describe('notebook creation entry point', () => {
  it('opens creation with the current notebook and preserves notebook actions', () => {
    render(
      <NotebookHeader
        notebook={{
          id: 'notebook:a/b',
          name: 'Research',
          description: 'Sources for a brief',
          archived: false,
          source_count: 2,
          note_count: 1,
          created: '2026-10-01',
          updated: '2026-10-02'
        }}
      />
    )
    expect(
      screen.getByRole('link', { name: 'workflows.createFromNotebook' })
    ).toHaveAttribute('href', '/studio?notebook=notebook%3Aa%2Fb')
    expect(
      screen.getByRole('button', { name: 'notebooks.archive' })
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'common.delete' })).toBeVisible()
    expect(screen.getByTestId('readiness')).toHaveTextContent('notebook:a/b')
  })
})
