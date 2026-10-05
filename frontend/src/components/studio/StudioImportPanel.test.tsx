import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudioImportPanel } from './StudioImportPanel'
import { STUDIO_IMPORT_BYTES } from '@/lib/utils/studio-import'

const mutation = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  isError: false,
  error: null
}))
vi.mock('@/lib/hooks/studio', () => ({ useStudioImport: () => mutation }))
const json = (title: string) =>
  JSON.stringify({
    id: 'a'.repeat(32),
    notebook_id: 'notebook:original',
    kind: 'slides',
    title,
    cards: [{ id: 'section-1', title: 'A section' }],
    sources: [{ id: 'source:one', title: 'Original source' }]
  })
function file(text: Promise<string> | string) {
  const value = new File(['small'], 'draft.json', { type: 'application/json' })
  Object.defineProperty(value, 'text', {
    configurable: true,
    value: () => Promise.resolve(text)
  })
  return value
}
beforeEach(() => {
  vi.clearAllMocks()
  mutation.isPending = false
  mutation.isError = false
})
describe('Studio JSON import', () => {
  it('requires an explicit import after preview and submits only to the chosen notebook', async () => {
    const onImported = vi.fn()
    mutation.mutateAsync.mockResolvedValue({ id: 'new-artifact' })
    render(
      <StudioImportPanel
        notebookId="notebook:destination"
        notebookName="Destination"
        onImported={onImported}
        onCancel={vi.fn()}
      />
    )
    fireEvent.change(screen.getByLabelText('studio.importFile'), {
      target: { files: [file(json('Imported research'))] }
    })
    expect(await screen.findByText('Imported research')).toBeInTheDocument()
    expect(mutation.mutateAsync).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'studio.importAction' }))
    await waitFor(() =>
      expect(onImported).toHaveBeenCalledWith({ id: 'new-artifact' })
    )
    expect(mutation.mutateAsync).toHaveBeenCalledTimes(1)
    expect(mutation.mutateAsync).toHaveBeenCalledWith({
      format_version: 1,
      notebook_id: 'notebook:destination',
      artifact: JSON.parse(json('Imported research'))
    })
  })
  it('rejects an oversized file before reading or sending it', async () => {
    const oversized = file('irrelevant')
    Object.defineProperty(oversized, 'size', { value: STUDIO_IMPORT_BYTES })
    const read = vi.spyOn(oversized, 'text')
    render(
      <StudioImportPanel
        notebookId="notebook:one"
        notebookName="One"
        onImported={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    fireEvent.change(screen.getByLabelText('studio.importFile'), {
      target: { files: [oversized] }
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'studio.importLimit'
    )
    expect(read).not.toHaveBeenCalled()
    expect(mutation.mutateAsync).not.toHaveBeenCalled()
  })
  it('ignores a stale file read after a newer selection', async () => {
    let resolveOld!: (value: string) => void
    const old = new Promise<string>((resolve) => {
      resolveOld = resolve
    })
    render(
      <StudioImportPanel
        notebookId="notebook:one"
        notebookName="One"
        onImported={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    const input = screen.getByLabelText('studio.importFile')
    fireEvent.change(input, { target: { files: [file(old)] } })
    fireEvent.change(input, { target: { files: [file(json('Newest draft'))] } })
    expect(await screen.findByText('Newest draft')).toBeInTheDocument()
    await act(async () => resolveOld(json('Stale draft')))
    expect(screen.queryByText('Stale draft')).not.toBeInTheDocument()
  })
  it('blocks cancellation and reports pending state while the server import runs', () => {
    mutation.isPending = true
    const onBusy = vi.fn()
    const result = render(
      <StudioImportPanel
        notebookId="notebook:one"
        notebookName="One"
        onImported={vi.fn()}
        onCancel={vi.fn()}
        onBusyChange={onBusy}
      />
    )
    expect(onBusy).toHaveBeenCalledWith(true)
    expect(
      screen.getByRole('button', { name: 'studio.importCancel' })
    ).toBeDisabled()
    expect(screen.getByLabelText('studio.importFile')).toBeDisabled()
    result.unmount()
    expect(onBusy).toHaveBeenLastCalledWith(false)
  })
})
