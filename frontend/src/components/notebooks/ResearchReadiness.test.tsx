import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResearchReadiness } from './ResearchReadiness'
import { useStudioReadiness } from '@/lib/hooks/studio'
import type { StudioReadiness } from '@/lib/types/studio'
import { workflowTranslations } from '@/lib/locales/workflows'

vi.mock('@/lib/hooks/studio', () => ({ useStudioReadiness: vi.fn() }))
vi.mock('@/lib/hooks/use-translation', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      workflowTranslations[
        key.replace('workflows.', '') as keyof typeof workflowTranslations
      ] || key
  })
}))
vi.mock('@/components/sources/AddSourceDialog', () => ({
  AddSourceDialog: ({
    defaultNotebookId,
    onOpenChange
  }: {
    defaultNotebookId: string
    onOpenChange: (open: boolean) => void
  }) => (
    <div role="dialog" aria-label={defaultNotebookId}>
      <button onClick={() => onOpenChange(false)}>Close source form</button>
    </div>
  )
}))

const refetch = vi.fn()
const empty: StudioReadiness = {
  notebook_id: 'notebook:a/b',
  sources: [],
  notes: [],
  ready_source_count: 0,
  warnings: []
}
const mockReadiness = (data = empty, options = {}) =>
  vi
    .mocked(useStudioReadiness)
    .mockReturnValue({
      data,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch,
      ...options
    } as unknown as ReturnType<typeof useStudioReadiness>)

describe('ResearchReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadiness()
  })

  it('opens source creation with the current notebook selected and refreshes on close', () => {
    render(<ResearchReadiness notebookId="notebook:a/b" />)
    expect(screen.getByText('Start with a source or a note.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Add sources' }))
    expect(screen.getByRole('dialog', { name: 'notebook:a/b' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Close source form' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('keeps ready material available while pointing to processing and failed sources', () => {
    mockReadiness({
      ...empty,
      sources: [
        { id: 'source:ready', title: 'Ready source', ready: true },
        {
          id: 'source:pending',
          title: 'Pending source',
          ready: false,
          status: 'pending'
        },
        {
          id: 'source:failed/one',
          title: 'Failed source',
          ready: false,
          status: 'failed'
        }
      ],
      notes: [{ id: 'note:one', title: 'A note', ready: true }],
      ready_source_count: 1
    })
    render(<ResearchReadiness notebookId="notebook:a/b" />)
    expect(screen.getByText('1 source and 1 note ready to use.')).toBeVisible()
    const details = screen
      .getByText(/Review affected sources/)
      .closest('details')!
    expect(details.textContent).toContain('Sources processing: 1.')
    expect(details.textContent).toContain('Sources needing attention: 1.')
    fireEvent.click(screen.getByText(/Review affected sources/))
    expect(
      screen.getByRole('link', { name: 'Review source: Failed source' })
    ).toHaveAttribute(
      'href',
      '/notebooks/notebook%3Aa%2Fb?modal=source&id=source%3Afailed%2Fone'
    )
  })

  it('offers a bounded retry after a readiness failure', () => {
    mockReadiness(empty, { isError: true })
    render(<ResearchReadiness notebookId="notebook:a/b" />)
    expect(
      screen.getByText(/Source readiness could not be checked/)
    ).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('does not display material from a different notebook', () => {
    mockReadiness({
      ...empty,
      notebook_id: 'notebook:other',
      sources: [
        { id: 'source:other', title: 'Other private source', ready: true }
      ]
    })
    render(<ResearchReadiness notebookId="notebook:a/b" />)
    expect(screen.queryByText('Other private source')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
  })
})
