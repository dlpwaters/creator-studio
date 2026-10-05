import { StrictMode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SearchPage from './page'

const { params, search, ask, defaults, mutate, sendAsk, t } = vi.hoisted(() => ({
  params: { value: new URLSearchParams() },
  search: { isPending: false },
  ask: { isStreaming: false },
  defaults: { isLoading: false, data: { default_chat_model: 'model:chat', default_embedding_model: 'model:embedding' } as { default_chat_model: string | null; default_embedding_model: string | null } | null },
  mutate: vi.fn(), sendAsk: vi.fn(), t: (key: string) => key,
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => params.value }))
vi.mock('@/lib/hooks/use-translation', () => ({ useTranslation: () => ({ t }) }))
vi.mock('@/lib/hooks/use-search', () => ({ useSearch: () => ({ ...search, mutate }) }))
vi.mock('@/lib/hooks/use-ask', () => ({ useAsk: () => ({ ...ask, sendAsk, strategy: null, answers: [], finalAnswer: null, error: null }) }))
vi.mock('@/lib/hooks/use-models', () => ({ useModelDefaults: () => ({ ...defaults }), useModels: () => ({ data: [] }) }))
vi.mock('@/lib/hooks/use-modal-manager', () => ({ useModalManager: () => ({ openModal: vi.fn() }) }))
vi.mock('@/components/layout/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/components/search/StreamingResponse', () => ({ StreamingResponse: () => null }))
vi.mock('@/components/search/AdvancedModelsDialog', () => ({ AdvancedModelsDialog: () => null }))
vi.mock('@/components/search/SaveToNotebooksDialog', () => ({ SaveToNotebooksDialog: () => null }))

describe('search deep-link dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    params.value = new URLSearchParams()
    search.isPending = false
    ask.isStreaming = false
    defaults.isLoading = false
    defaults.data = { default_chat_model: 'model:chat', default_embedding_model: 'model:embedding' }
  })

  it('dispatches initial search exactly once across pending and repeated renders', () => {
    params.value = new URLSearchParams('q=First+query&mode=search')
    const { rerender } = render(<StrictMode><SearchPage /></StrictMode>)
    search.isPending = true
    rerender(<StrictMode><SearchPage /></StrictMode>)
    search.isPending = false
    rerender(<StrictMode><SearchPage /></StrictMode>)
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ query: 'First query' }))
  })

  it('uses the new URL query once instead of the previous input state', () => {
    params.value = new URLSearchParams('q=First&mode=search')
    const { rerender } = render(<SearchPage />)
    params.value = new URLSearchParams('q=Second&mode=search')
    rerender(<SearchPage />)
    expect(mutate.mock.calls.map(call => call[0].query)).toEqual(['First', 'Second'])
    expect(screen.getByRole('textbox', { name: 'common.accessibility.enterSearch' })).toHaveValue('Second')
    rerender(<SearchPage />)
    expect(mutate).toHaveBeenCalledTimes(2)
  })

  it('waits for Ask defaults and dispatches once when they become ready', () => {
    params.value = new URLSearchParams('q=Question&mode=ask')
    defaults.isLoading = true
    defaults.data = null
    const { rerender } = render(<SearchPage />)
    expect(sendAsk).not.toHaveBeenCalled()
    defaults.isLoading = false
    defaults.data = { default_chat_model: null, default_embedding_model: 'model:embedding' }
    rerender(<SearchPage />)
    expect(sendAsk).not.toHaveBeenCalled()
    defaults.data.default_chat_model = 'model:ready'
    rerender(<SearchPage />)
    ask.isStreaming = true
    rerender(<SearchPage />)
    ask.isStreaming = false
    rerender(<SearchPage />)
    expect(sendAsk).toHaveBeenCalledExactlyOnceWith('Question', { strategy: 'model:ready', answer: 'model:ready', finalAnswer: 'model:ready' })
  })

  it('dispatches a cached-default Ask deep link once under Strict Mode', () => {
    params.value = new URLSearchParams('q=Question&mode=ask')
    const { rerender } = render(<StrictMode><SearchPage /></StrictMode>)
    rerender(<StrictMode><SearchPage /></StrictMode>)
    expect(sendAsk).toHaveBeenCalledTimes(1)
  })

  it('waits for the current Ask stream before dispatching the latest URL question', () => {
    params.value = new URLSearchParams('q=First&mode=ask')
    const { rerender } = render(<SearchPage />)
    ask.isStreaming = true
    params.value = new URLSearchParams('q=Second&mode=ask')
    rerender(<SearchPage />)
    params.value = new URLSearchParams('q=Latest&mode=ask')
    rerender(<SearchPage />)
    expect(sendAsk).toHaveBeenCalledTimes(1)
    ask.isStreaming = false
    rerender(<SearchPage />)
    expect(sendAsk.mock.calls.map(call => call[0])).toEqual(['First', 'Latest'])
  })

  it('preserves manual search when the URL has no query', () => {
    render(<SearchPage />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'searchPage.search' }))
    const input = screen.getByRole('textbox', { name: 'common.accessibility.enterSearch' })
    fireEvent.change(input, { target: { value: 'Manual query' } })
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13 })
    expect(mutate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ query: 'Manual query' }))
    expect(sendAsk).not.toHaveBeenCalled()
  })
})
