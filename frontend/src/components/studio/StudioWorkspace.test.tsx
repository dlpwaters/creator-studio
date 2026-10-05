import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StudioArtifact, StudioArtifactSummary } from '@/lib/types/studio'
import { StudioWorkspace } from './StudioWorkspace'

const state = vi.hoisted(() => ({
  get: vi.fn(),
  copy: vi.fn(),
  replace: vi.fn()
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: state.replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('notebook=notebook:one')
}))
vi.mock('@/lib/api/studio', () => ({ studioApi: { get: state.get } }))
vi.mock('@/lib/hooks/use-notebooks', () => ({
  useNotebooks: () => ({
    data: [
      { id: 'notebook:one', name: 'One' },
      { id: 'notebook:two', name: 'Two' }
    ],
    isLoading: false,
    isError: false
  })
}))
vi.mock('@/lib/hooks/studio', () => ({
  useStudioCapabilities: () => ({
    data: { ai_available: true, supported_kinds: ['slides'] },
    isLoading: false,
    isError: false
  }),
  useStudioCopy: () => ({
    mutateAsync: state.copy,
    isPending: false,
    isError: false
  })
}))
vi.mock('./StudioCreateForm', () => ({
  StudioCreateForm: () => <p>Create panel</p>
}))
vi.mock('./ArtifactLibrary', () => ({
  ArtifactLibrary: ({
    onSelect,
    onImport,
    disabled
  }: {
    onSelect: (summary: StudioArtifactSummary) => void
    onImport: () => void
    disabled: boolean
  }) => (
    <div>
      <button
        disabled={disabled}
        onClick={() => onSelect({ id: 'artifact-a' } as StudioArtifactSummary)}
      >
        Open summary A
      </button>
      <button
        disabled={disabled}
        onClick={() => onSelect({ id: 'artifact-b' } as StudioArtifactSummary)}
      >
        Open summary B
      </button>
      <button disabled={disabled} onClick={onImport}>
        Import JSON
      </button>
    </div>
  )
}))
vi.mock('./ArtifactReview', () => ({
  ArtifactReview: ({
    artifact,
    onCopy,
    onDirtyChange,
    onBusyChange
  }: {
    artifact: StudioArtifact
    onCopy: () => void
    onDirtyChange: (dirty: boolean) => void
    onBusyChange: (busy: boolean) => void
  }) => (
    <article>
      <p data-testid="open-artifact">{artifact.title}</p>
      <button onClick={onCopy}>Make a copy</button>
      <button onClick={() => onDirtyChange(true)}>Mark draft dirty</button>
      <button onClick={() => onBusyChange(true)}>Start server save</button>
    </article>
  )
}))
vi.mock('./StudioImportPanel', () => ({
  StudioImportPanel: ({
    onBusyChange
  }: {
    onBusyChange: (busy: boolean) => void
  }) => <button onClick={() => onBusyChange(true)}>Start server import</button>
}))
beforeEach(() => {
  vi.clearAllMocks()
  state.get.mockImplementation(async (id: string) => ({ id, title: id }))
  state.copy.mockResolvedValue({ id: 'artifact-copy', title: 'Copy' })
})
describe('Studio transfer integration', () => {
  it('fetches full content only when a summary is chosen, then copies into the selected notebook', async () => {
    render(<StudioWorkspace />)
    expect(state.get).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Open summary A' }))
    expect(await screen.findByTestId('open-artifact')).toHaveTextContent(
      'artifact-a'
    )
    expect(state.get).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Make a copy' }))
    await waitFor(() =>
      expect(screen.getByTestId('open-artifact')).toHaveTextContent('Copy')
    )
    expect(state.copy).toHaveBeenCalledWith({
      id: 'artifact-a',
      data: { notebook_id: 'notebook:one' }
    })
  })
  it('confirms unsaved navigation before fetching a different artifact', async () => {
    render(<StudioWorkspace />)
    fireEvent.click(screen.getByRole('button', { name: 'Open summary A' }))
    await screen.findByTestId('open-artifact')
    fireEvent.click(screen.getByRole('button', { name: 'Mark draft dirty' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open summary B' }))
    expect(state.get).toHaveBeenCalledTimes(1)
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.continueEditing' })
    )
    expect(screen.getByTestId('open-artifact')).toHaveTextContent('artifact-a')
    expect(state.get).toHaveBeenCalledTimes(1)
  })
  it('locks the destination notebook while an explicit import is pending', () => {
    render(<StudioWorkspace />)
    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start server import' }))
    expect(
      screen.getByRole('combobox', { name: 'studio.notebook' })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Open summary A' })
    ).toBeDisabled()
  })
  it('locks notebook and library navigation while the selected draft is saving', async () => {
    render(<StudioWorkspace />)
    fireEvent.click(screen.getByRole('button', { name: 'Open summary A' }))
    await screen.findByTestId('open-artifact')
    fireEvent.click(screen.getByRole('button', { name: 'Start server save' }))
    expect(
      screen.getByRole('combobox', { name: 'studio.notebook' })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Open summary B' })
    ).toBeDisabled()
    expect(state.get).toHaveBeenCalledTimes(1)
  })
})
