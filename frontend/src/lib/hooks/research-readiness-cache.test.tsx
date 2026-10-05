import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sourcesApi } from '@/lib/api/sources'
import { notebooksApi } from '@/lib/api/notebooks'
import {
  useAddSourcesToNotebook,
  useCreateSource,
  useDeleteSource,
  useFileUpload,
  useRemoveSourceFromNotebook,
  useRetrySource,
  useUpdateSource
} from './use-sources'
import { useCreateNote, useDeleteNote, useUpdateNote } from './use-notes'

vi.mock('@/lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() })
}))
vi.mock('@/lib/api/sources', () => ({
  sourcesApi: {
    create: vi.fn().mockResolvedValue({ id: 'source:new' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn().mockResolvedValue({}),
    upload: vi.fn().mockResolvedValue({})
  }
}))
vi.mock('@/lib/api/notes', () => ({
  notesApi: {
    create: vi.fn().mockResolvedValue({ id: 'note:new' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined)
  }
}))
vi.mock('@/lib/api/notebooks', () => ({
  notebooksApi: {
    addSource: vi.fn().mockResolvedValue({}),
    removeSource: vi.fn().mockResolvedValue({})
  }
}))

let client: QueryClient
const first = ['studio', 'readiness', 'notebook:first']
const second = ['studio', 'readiness', 'notebook:second']
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)
const expectScope = (firstInvalidated: boolean, secondInvalidated: boolean) => {
  expect(client.getQueryState(first)?.isInvalidated).toBe(firstInvalidated)
  expect(client.getQueryState(second)?.isInvalidated).toBe(secondInvalidated)
}

describe('source and note changes refresh research readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    client = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } }
    })
    client.setQueryData(first, { ready_source_count: 0 })
    client.setQueryData(second, { ready_source_count: 0 })
  })

  it('refreshes only explicitly linked notebooks when a source is created', async () => {
    const { result } = renderHook(useCreateSource, { wrapper })
    await act(() =>
      result.current.mutateAsync({
        type: 'text',
        content: 'An example source.',
        notebooks: ['notebook:first']
      })
    )
    expectScope(true, false)
  })

  it('refreshes both selected notebooks for a source attached to several notebooks', async () => {
    const { result } = renderHook(useCreateSource, { wrapper })
    await act(() =>
      result.current.mutateAsync({
        type: 'text',
        content: 'An example source.',
        notebooks: ['notebook:first', 'notebook:second']
      })
    )
    expectScope(true, true)
  })

  it('does not invalidate readiness when source creation fails', async () => {
    vi.mocked(sourcesApi.create).mockRejectedValueOnce(
      new Error('Example failure')
    )
    const { result } = renderHook(useCreateSource, { wrapper })
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          type: 'text',
          notebooks: ['notebook:first']
        })
      ).rejects.toThrow('Example failure')
    })
    expectScope(false, false)
  })

  it('refreshes all affected notebooks when a shared source is updated', async () => {
    const { result } = renderHook(useUpdateSource, { wrapper })
    await act(() =>
      result.current.mutateAsync({
        id: 'source:shared',
        data: { title: 'A revised title' }
      })
    )
    expectScope(true, true)
  })

  it.each([
    ['deleted', useDeleteSource],
    ['retried', useRetrySource]
  ] as const)(
    'refreshes readiness when a shared source is %s',
    async (_, hook) => {
      const { result } = renderHook(() => hook(), { wrapper })
      await act(async () => {
        await result.current.mutateAsync('source:shared')
      })
      expectScope(true, true)
    }
  )

  it('refreshes the target notebook after an upload', async () => {
    const { result } = renderHook(useFileUpload, { wrapper })
    await act(() =>
      result.current.mutateAsync({
        file: new File(['Example'], 'example.txt'),
        notebookId: 'notebook:first'
      })
    )
    expectScope(true, false)
  })

  it('refreshes the target notebook after partial source attachment', async () => {
    vi.mocked(notebooksApi.addSource).mockRejectedValueOnce(
      new Error('Example attachment failure')
    )
    const { result } = renderHook(useAddSourcesToNotebook, { wrapper })
    await act(async () => {
      const added = await result.current.mutateAsync({
        notebookId: 'notebook:first',
        sourceIds: ['source:failed', 'source:added']
      })
      expect(added).toEqual({ successes: 1, failures: 1, total: 2 })
    })
    expectScope(true, false)
  })

  it('refreshes the target notebook when a source is unlinked', async () => {
    const { result } = renderHook(useRemoveSourceFromNotebook, { wrapper })
    await act(() =>
      result.current.mutateAsync({
        notebookId: 'notebook:first',
        sourceId: 'source:shared'
      })
    )
    expectScope(true, false)
  })

  it('refreshes the target notebook when a note is created', async () => {
    const { result } = renderHook(useCreateNote, { wrapper })
    await act(() =>
      result.current.mutateAsync({
        notebook_id: 'notebook:first',
        content: 'An example note.'
      })
    )
    expectScope(true, false)
  })

  it('refreshes readiness when a note is edited', async () => {
    const { result } = renderHook(useUpdateNote, { wrapper })
    await act(() =>
      result.current.mutateAsync({
        id: 'note:first',
        data: { content: 'Updated example.' }
      })
    )
    expectScope(true, true)
  })

  it('refreshes readiness when a note is deleted', async () => {
    const { result } = renderHook(useDeleteNote, { wrapper })
    await act(() => result.current.mutateAsync('note:first'))
    expectScope(true, true)
  })
})
