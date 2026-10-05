import { act, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SourceDetailContent } from './SourceDetailContent'
import { sourcesApi } from '@/lib/api/sources'
import { insightsApi, type SourceInsightResponse } from '@/lib/api/insights'
import type { SourceDetailResponse } from '@/lib/types/api'

const { t } = vi.hoisted(() => ({ t: (key: string) => key }))
vi.mock('@/lib/hooks/use-translation', () => ({ useTranslation: () => ({ t, language: 'en-US' }) }))
vi.mock('@/lib/api/sources', () => ({ sourcesApi: { get: vi.fn(), update: vi.fn(), delete: vi.fn() } }))
vi.mock('@/lib/api/insights', () => ({ insightsApi: { listForSource: vi.fn() } }))
vi.mock('@/lib/api/transformations', () => ({ transformationsApi: { list: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/components/source/NotebookAssociations', () => ({ NotebookAssociations: () => null }))
vi.mock('@/components/source/SourceInsightDialog', () => ({ SourceInsightDialog: () => null }))
vi.mock('@/components/common/InlineEdit', () => ({ InlineEdit: ({ value }: { value: string }) => <h1>{value}</h1> }))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail })
  return { promise, resolve, reject }
}

const source = (id: string): SourceDetailResponse => ({
  id, title: `Title ${id}`, full_text: `Content ${id}`, asset: null, embedded: true, embedded_chunks: 1, insights_count: 0, created: '2026-10-01', updated: '2026-10-01',
})
const insight = (id: string): SourceInsightResponse => ({ id: `insight:${id}`, source_id: id, insight_type: 'summary', content: `Insight ${id}`, created: '2026-10-01', updated: '2026-10-01' })
let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>

describe('source detail request ownership', () => {
  beforeEach(() => { vi.clearAllMocks(); client = new QueryClient(); vi.spyOn(console, 'error').mockImplementation(() => undefined) })
  afterEach(() => vi.restoreAllMocks())

  it('keeps B source and insights when pending A responses finish afterward', async () => {
    const sourceA = deferred<SourceDetailResponse>()
    const sourceB = deferred<SourceDetailResponse>()
    const insightsA = deferred<SourceInsightResponse[]>()
    const insightsB = deferred<SourceInsightResponse[]>()
    vi.mocked(sourcesApi.get).mockImplementation(id => id === 'source:A' ? sourceA.promise : sourceB.promise)
    vi.mocked(insightsApi.listForSource).mockImplementation(id => id === 'source:A' ? insightsA.promise : insightsB.promise)
    const { rerender } = render(<SourceDetailContent sourceId="source:A" />, { wrapper })
    rerender(<SourceDetailContent sourceId="source:B" />)
    await act(async () => { sourceB.resolve(source('source:B')); insightsB.resolve([insight('source:B')]) })
    expect(screen.getByRole('heading', { name: 'Title source:B' })).toBeVisible()
    fireEvent.mouseDown(screen.getByRole('tab', { name: /common.insights/ }))
    expect(screen.getByText('Insight source:B')).toBeVisible()
    await act(async () => { sourceA.resolve(source('source:A')); insightsA.resolve([insight('source:A')]) })
    expect(screen.getByRole('heading', { name: 'Title source:B' })).toBeVisible()
    expect(screen.getByText('Insight source:B')).toBeVisible()
    expect(screen.queryByText('Title source:A')).not.toBeInTheDocument()
    expect(screen.queryByText('Insight source:A')).not.toBeInTheDocument()
    expect(sourcesApi.update).not.toHaveBeenCalled()
    expect(sourcesApi.delete).not.toHaveBeenCalled()
  })

  it('clears an A loading error when switching to a successful B source', async () => {
    vi.mocked(sourcesApi.get).mockRejectedValueOnce(new Error('Example load failure')).mockResolvedValueOnce(source('source:B'))
    vi.mocked(insightsApi.listForSource).mockResolvedValue([])
    const { rerender } = render(<SourceDetailContent sourceId="source:A" />, { wrapper })
    expect(await screen.findByText('sources.loadFailed')).toBeVisible()
    rerender(<SourceDetailContent sourceId="source:B" />)
    expect(await screen.findByRole('heading', { name: 'Title source:B' })).toBeVisible()
    expect(screen.queryByText('sources.loadFailed')).not.toBeInTheDocument()
  })

  it('ignores a late A failure after B has loaded', async () => {
    const sourceA = deferred<SourceDetailResponse>()
    vi.mocked(sourcesApi.get).mockImplementation(id => id === 'source:A' ? sourceA.promise : Promise.resolve(source('source:B')))
    vi.mocked(insightsApi.listForSource).mockResolvedValue([])
    const { rerender } = render(<SourceDetailContent sourceId="source:A" />, { wrapper })
    rerender(<SourceDetailContent sourceId="source:B" />)
    expect(await screen.findByRole('heading', { name: 'Title source:B' })).toBeVisible()
    await act(async () => { sourceA.reject(new Error('Late example failure')) })
    expect(screen.getByRole('heading', { name: 'Title source:B' })).toBeVisible()
    expect(screen.queryByText('sources.loadFailed')).not.toBeInTheDocument()
  })

  it('clears old source actions immediately while B is loading', async () => {
    const sourceB = deferred<SourceDetailResponse>()
    vi.mocked(sourcesApi.get).mockImplementation(id => id === 'source:A' ? Promise.resolve(source('source:A')) : sourceB.promise)
    vi.mocked(insightsApi.listForSource).mockResolvedValue([])
    const { rerender } = render(<SourceDetailContent sourceId="source:A" />, { wrapper })
    expect(await screen.findByRole('heading', { name: 'Title source:A' })).toBeVisible()
    rerender(<SourceDetailContent sourceId="source:B" />)
    expect(screen.queryByRole('heading', { name: 'Title source:A' })).not.toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toBeVisible()
    await act(async () => { sourceB.resolve(source('source:B')) })
    expect(screen.getByRole('heading', { name: 'Title source:B' })).toBeVisible()
  })
})
