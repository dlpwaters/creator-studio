import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArtifactLibrary } from './ArtifactLibrary'
import { useStudioLibrary } from '@/lib/hooks/studio'
import type {
  StudioArtifactSummary,
  StudioLibraryPage
} from '@/lib/types/studio'

vi.mock('@/lib/hooks/studio', () => ({ useStudioLibrary: vi.fn() }))
const summary: StudioArtifactSummary = {
  id: 'artifact-one',
  notebook_id: 'notebook:one',
  kind: 'slides',
  title: 'Ocean research',
  audience: 'Readers',
  language: 'en-US',
  style: 'editorial',
  generation: 'extractive',
  created_at: '2026-10-04T00:00:00Z',
  updated_at: '2026-10-04T01:00:00Z',
  card_count: 7,
  reference_status: 'notebook',
  notebook_available: true
}
const page: StudioLibraryPage = {
  items: [summary],
  total: 29,
  filtered_total: 29,
  page: 1,
  page_size: 12,
  pages: 3
}
let response: {
  data: StudioLibraryPage | undefined
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  error: unknown
  refetch: ReturnType<typeof vi.fn>
}
function setup(
  props: Partial<React.ComponentProps<typeof ArtifactLibrary>> = {}
) {
  const onSelect = vi.fn(),
    onCreate = vi.fn(),
    onImport = vi.fn()
  let properties = {
    notebookId: 'notebook:one',
    disabled: false,
    onSelect,
    onCreate,
    onImport,
    ...props
  }
  const rendered = render(<ArtifactLibrary {...properties} />)
  return {
    ...rendered,
    onSelect,
    onCreate,
    onImport,
    refreshRender: (
      changes: Partial<React.ComponentProps<typeof ArtifactLibrary>> = {}
    ) => {
      properties = { ...properties, ...changes }
      rendered.rerender(<ArtifactLibrary {...properties} />)
    }
  }
}
const lastOptions = () => vi.mocked(useStudioLibrary).mock.calls.at(-1)![1]!
beforeEach(() => {
  vi.clearAllMocks()
  response = {
    data: { ...page },
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn()
  }
  vi.mocked(useStudioLibrary).mockImplementation(
    () => response as unknown as ReturnType<typeof useStudioLibrary>
  )
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
describe('ArtifactLibrary', () => {
  it('collapses on parent selection, preserves filters when reopened, and collapses for a different draft', () => {
    vi.useFakeTimers()
    const result = setup()
    const disclosure = screen.getByRole('button', {
      name: 'studio.libraryHide'
    })
    const controlsId = disclosure.getAttribute('aria-controls')!
    expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    fireEvent.change(screen.getByLabelText('studio.librarySearch'), {
      target: { value: 'ocean' }
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.change(screen.getByLabelText('studio.libraryFormat'), {
      target: { value: 'video' }
    })
    fireEvent.change(screen.getByLabelText('studio.librarySort'), {
      target: { value: 'title' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'studio.libraryNext' }))
    screen.getByLabelText('studio.librarySearch').focus()
    result.refreshRender({ selectedId: summary.id })
    expect(
      screen.getByRole('button', { name: 'studio.libraryBrowse' })
    ).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.getByRole('button', { name: 'studio.libraryBrowse' })
    ).toHaveFocus()
    expect(document.getElementById(controlsId)).not.toBeVisible()
    expect(screen.getByRole('button', { name: 'studio.create' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'studio.libraryImport' })
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'studio.refresh' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent(
      'studio.libraryResults'
    )
    expect(lastOptions()).toMatchObject({
      query: 'ocean',
      kind: 'video',
      sort: 'title',
      page: 2
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.libraryBrowse' })
    )
    expect(document.getElementById(controlsId)).toBeVisible()
    expect(screen.getByLabelText('studio.librarySearch')).toHaveValue('ocean')
    expect(screen.getByLabelText('studio.libraryFormat')).toHaveValue('video')
    expect(screen.getByLabelText('studio.librarySort')).toHaveValue('title')
    expect(lastOptions().page).toBe(2)
    result.refreshRender({ selectedId: summary.id })
    expect(
      screen.getByRole('button', { name: 'studio.libraryHide' })
    ).toHaveAttribute('aria-controls', controlsId)
    result.refreshRender({ selectedId: 'artifact-two' })
    expect(
      screen.getByRole('button', { name: 'studio.libraryBrowse' })
    ).toHaveAttribute('aria-controls', controlsId)
    expect(document.getElementById(controlsId)).not.toBeVisible()
    result.refreshRender({ selectedId: undefined })
    expect(
      screen.getByRole('button', { name: 'studio.libraryHide' })
    ).toHaveAttribute('aria-expanded', 'true')
  })
  it('retains visible errors and pending locks while the library is collapsed', () => {
    response = {
      ...response,
      isError: true,
      error: new Error('Refresh failed')
    }
    const result = setup({ selectedId: summary.id })
    expect(screen.getByRole('alert')).toHaveTextContent('Refresh failed')
    fireEvent.click(screen.getByRole('button', { name: 'studio.retry' }))
    expect(response.refetch).toHaveBeenCalledTimes(1)
    response.isFetching = true
    result.refreshRender({ disabled: true })
    expect(
      screen.getByRole('button', { name: 'studio.libraryBrowse' })
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'studio.create' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'studio.libraryImport' })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'studio.refresh' })
    ).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'studio.libraryResults'
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'studio.libraryRefreshing'
    )
    expect(
      screen.queryByRole('button', { name: 'studio.retry' })
    ).not.toBeInTheDocument()
  })

  it('requests bounded summaries and passes selection without fetching full card data', () => {
    const result = setup({ selectedId: summary.id })
    expect(useStudioLibrary).toHaveBeenCalledWith(
      'notebook:one',
      expect.objectContaining({
        scope: 'notebook',
        sort: 'updated',
        page: 1,
        page_size: 12
      })
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.libraryBrowse' })
    )
    const item = screen.getByRole('button', { name: /Ocean research/ })
    expect(item).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(item)
    expect(result.onSelect).toHaveBeenCalledWith(summary)
    expect(result.onSelect.mock.calls[0][0]).not.toHaveProperty('cards')
  })
  it('debounces search for 300ms, caps input at 200 characters, and resets pagination', () => {
    vi.useFakeTimers()
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.libraryNext' }))
    expect(lastOptions().page).toBe(2)
    fireEvent.change(screen.getByLabelText('studio.librarySearch'), {
      target: { value: 'ocean' }
    })
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(lastOptions().query).toBeUndefined()
    expect(lastOptions().page).toBe(2)
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(lastOptions()).toMatchObject({ query: 'ocean', page: 1 })
    fireEvent.change(screen.getByLabelText('studio.librarySearch'), {
      target: { value: 'x'.repeat(220) }
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(lastOptions().query).toHaveLength(200)
  })
  it('does not reset an early page change when the initial search is empty', () => {
    vi.useFakeTimers()
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.libraryNext' }))
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(lastOptions().page).toBe(2)
  })
  it('resets pagination when format or sorting changes', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.libraryNext' }))
    fireEvent.change(screen.getByLabelText('studio.libraryFormat'), {
      target: { value: 'quiz' }
    })
    expect(lastOptions()).toMatchObject({ kind: 'quiz', page: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'studio.libraryNext' }))
    fireEvent.change(screen.getByLabelText('studio.librarySort'), {
      target: { value: 'title' }
    })
    expect(lastOptions()).toMatchObject({
      kind: 'quiz',
      sort: 'title',
      page: 1
    })
  })
  it('uses server-clamped page values for next and previous controls', () => {
    response.data = { ...page, page: 2, pages: 2 }
    setup()
    expect(
      screen.getByRole('button', { name: 'studio.libraryNext' })
    ).toBeDisabled()
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.libraryPrevious' })
    )
    expect(lastOptions().page).toBe(1)
  })
  it('switches deleted-notebook scope with a clear restore-destination explanation', () => {
    const result = setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.libraryNext' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.libraryRecover' })
    )
    expect(lastOptions()).toMatchObject({ scope: 'orphaned', page: 1 })
    expect(screen.getByText('studio.libraryRecoveryHelp')).toBeInTheDocument()
    response.data = {
      ...page,
      items: [
        { ...summary, reference_status: 'snapshot', notebook_available: false }
      ]
    }
    result.refreshRender()
    expect(
      screen.getByText('studio.librarySavedReferences')
    ).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.libraryReturnNotebook' })
    )
    expect(lastOptions().scope).toBe('notebook')
    expect(
      screen.queryByText('studio.libraryRecoveryHelp')
    ).not.toBeInTheDocument()
  })
  it('shows errors and retries explicitly without emitting a selection', () => {
    response = {
      ...response,
      data: undefined,
      isError: true,
      error: new Error('Connection failed')
    }
    const result = setup()
    expect(screen.getByRole('alert')).toHaveTextContent('Connection failed')
    fireEvent.click(screen.getByRole('button', { name: 'studio.retry' }))
    expect(response.refetch).toHaveBeenCalledTimes(1)
    expect(result.onSelect).not.toHaveBeenCalled()
  })
  it('distinguishes an empty notebook, empty orphan scope, and filtered empty results', () => {
    response.data = {
      ...page,
      items: [],
      total: 0,
      filtered_total: 0,
      pages: 1
    }
    setup()
    expect(screen.getByText('studio.libraryEmpty')).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.libraryRecover' })
    )
    expect(screen.getByText('studio.libraryOrphanedEmpty')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('studio.libraryFormat'), {
      target: { value: 'video' }
    })
    expect(screen.getByText('studio.libraryNoMatches')).toBeInTheDocument()
    fireEvent.click(
      screen.getAllByRole('button', { name: 'studio.libraryResetFilters' })[0]
    )
    expect(lastOptions().kind).toBeUndefined()
    expect(screen.getByText('studio.libraryOrphanedEmpty')).toBeInTheDocument()
  })
  it('exposes create, import, and refresh actions without changing selection', () => {
    const result = setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.create' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.libraryImport' })
    )
    fireEvent.click(screen.getByRole('button', { name: 'studio.refresh' }))
    expect(result.onCreate).toHaveBeenCalledTimes(1)
    expect(result.onImport).toHaveBeenCalledTimes(1)
    expect(response.refetch).toHaveBeenCalledTimes(1)
    expect(result.onSelect).not.toHaveBeenCalled()
  })
  it('keeps controls and selections disabled while the owner is busy', () => {
    const result = setup({ disabled: true })
    expect(screen.getByLabelText('studio.librarySearch')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'studio.create' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'studio.libraryImport' })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /Ocean research/ })
    ).toBeDisabled()
    expect(result.onSelect).not.toHaveBeenCalled()
  })
  it('shows a loading state and cleans up pending debounce timers on unmount', () => {
    vi.useFakeTimers()
    response = {
      ...response,
      data: undefined,
      isLoading: true,
      isFetching: true
    }
    const result = setup()
    expect(screen.getByRole('status')).toHaveTextContent(
      'studio.libraryLoading'
    )
    fireEvent.change(screen.getByLabelText('studio.librarySearch'), {
      target: { value: 'pending search' }
    })
    expect(vi.getTimerCount()).toBe(1)
    result.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
