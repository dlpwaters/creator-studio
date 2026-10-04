import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudioCreateForm } from './StudioCreateForm'
import { studioApi } from '@/lib/api/studio'
import { modelsApi } from '@/lib/api/models'
import type { StudioCapabilities, StudioReadiness } from '@/lib/types/studio'

vi.mock('@/lib/api/studio', () => ({
  studioApi: { readiness: vi.fn(), generate: vi.fn() }
}))
vi.mock('@/lib/api/models', () => ({
  modelsApi: { list: vi.fn(), getDefaults: vi.fn() }
}))
const capabilities: StudioCapabilities = {
  ai_available: true,
  pptx_available: true,
  video_available: true,
  supported_kinds: [
    'slides',
    'video',
    'brief',
    'quiz',
    'flashcards',
    'mindmap',
    'timeline'
  ]
}
const material: StudioReadiness = {
  notebook_id: 'notebook:one',
  ready_source_count: 2,
  sources: [
    { id: 'source:one', title: 'Ready source', ready: true },
    {
      id: 'source:unready',
      title: 'Processing source',
      ready: false,
      reason: 'Processing'
    },
    { id: 'source:two', title: 'Another source', ready: true }
  ],
  notes: [{ id: 'note:one', title: 'Research note', ready: true }],
  warnings: []
}
function setup(props = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return render(
    <QueryClientProvider client={client}>
      <StudioCreateForm
        notebookId="notebook:one"
        capabilities={capabilities}
        onCreated={vi.fn()}
        onBusy={vi.fn()}
        {...props}
      />
    </QueryClientProvider>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(studioApi.readiness).mockResolvedValue(material)
  vi.mocked(modelsApi.list).mockResolvedValue([
    {
      id: 'model:one',
      name: 'Research model',
      provider: 'local',
      type: 'language',
      created: '',
      updated: ''
    }
  ])
  vi.mocked(modelsApi.getDefaults).mockResolvedValue({
    default_chat_model: 'model:one'
  })
})
afterEach(cleanup)
describe('StudioCreateForm', () => {
  it('never generates on mount and only offers ready material for selection', async () => {
    setup()
    await screen.findByText('Ready source')
    expect(studioApi.generate).not.toHaveBeenCalled()
    expect(
      screen.getByRole('checkbox', { name: /Processing source/ })
    ).toBeDisabled()
    expect(
      screen.getByRole('checkbox', { name: /Research note/ })
    ).toBeChecked()
    expect(
      screen.getByRole('button', { name: 'studio.generate' })
    ).toBeDisabled()
  })
  it('submits exact selected IDs with extractive default and no model', async () => {
    vi.mocked(studioApi.generate).mockRejectedValue(new Error('Offline'))
    setup()
    await screen.findByText('Ready source')
    fireEvent.change(screen.getByLabelText('studio.topic'), {
      target: { value: 'Ocean research' }
    })
    fireEvent.click(screen.getByRole('checkbox', { name: /Another source/ }))
    fireEvent.click(screen.getByRole('button', { name: 'studio.generate' }))
    await waitFor(() => expect(studioApi.generate).toHaveBeenCalledTimes(1))
    expect(studioApi.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        source_ids: ['source:one'],
        note_ids: ['note:one'],
        generation: 'extractive',
        model_id: null
      })
    )
    await screen.findByText('Offline')
    expect(screen.getByLabelText('studio.topic')).toHaveValue('Ocean research')
    expect(studioApi.generate).toHaveBeenCalledTimes(1)
  })
  it('explicitly empty selection disables generation', async () => {
    setup()
    await screen.findByText('Ready source')
    fireEvent.change(screen.getByLabelText('studio.topic'), {
      target: { value: 'Ocean research' }
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.clearSelection' })
    )
    expect(
      screen.getByRole('button', { name: 'studio.generate' })
    ).toBeDisabled()
  })
  it('uses the configured model only after explicit AI choice', async () => {
    vi.mocked(studioApi.generate).mockRejectedValue(new Error('Provider error'))
    setup()
    await screen.findByText('Ready source')
    fireEvent.change(screen.getByLabelText('studio.topic'), {
      target: { value: 'Ocean research' }
    })
    fireEvent.click(screen.getByRole('radio', { name: 'studio.ai' }))
    await screen.findByRole('option', { name: 'Research model · local' })
    fireEvent.click(screen.getByRole('button', { name: 'studio.generate' }))
    await waitFor(() =>
      expect(studioApi.generate).toHaveBeenCalledWith(
        expect.objectContaining({ generation: 'ai', model_id: 'model:one' })
      )
    )
    await screen.findByText('Provider error')
    expect(studioApi.generate).toHaveBeenCalledTimes(1)
  })
  it('keeps unsaved review edits from being overwritten by a new draft', async () => {
    setup({ blocked: true })
    await screen.findByText('Ready source')
    fireEvent.change(screen.getByLabelText('studio.topic'), {
      target: { value: 'Ocean research' }
    })
    expect(
      screen.getByRole('button', { name: 'studio.generate' })
    ).toBeDisabled()
    expect(screen.getByText('studio.unsaved')).toBeInTheDocument()
  })
})
