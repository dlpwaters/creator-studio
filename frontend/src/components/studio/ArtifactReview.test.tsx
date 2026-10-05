import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArtifactReview } from './ArtifactReview'
import { readStudioDraft, writeStudioDraft } from '@/lib/utils/studio-draft'
import { requestNavigation } from '@/lib/utils/request-navigation'
import { studioApi } from '@/lib/api/studio'
import type { StudioArtifact, StudioCapabilities } from '@/lib/types/studio'

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('@/lib/api/studio', () => ({
  studioApi: { update: vi.fn(), delete: vi.fn(), export: vi.fn() }
}))
const artifact: StudioArtifact = {
  id: 'artifact-one',
  notebook_id: 'notebook:one',
  kind: 'slides',
  title: 'Ocean research',
  audience: 'Readers',
  style: 'editorial',
  language: 'en-US',
  created_at: '2026-10-04T00:00:00Z',
  updated_at: '2026-10-04T00:00:00Z',
  source_ids: ['source:one'],
  note_ids: [],
  generation: 'extractive',
  warnings: [],
  sources: [{ id: 'source:one', title: 'Field research' }],
  cards: [
    {
      id: 'card-one',
      title: 'Ocean temperatures',
      body: 'Evidence',
      bullets: ['Measured data'],
      notes: 'Narration',
      source_ids: ['source:one'],
      duration_seconds: 5
    }
  ]
}
const capabilities: StudioCapabilities = {
  ai_available: true,
  pptx_available: true,
  video_available: true,
  narration_available: true,
  supported_kinds: ['slides', 'video']
}
function setup(data = artifact, copying = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  const onUpdated = vi.fn(),
    onDeleted = vi.fn(),
    onDirtyChange = vi.fn(),
    onBusyChange = vi.fn()
  const review = (snapshot: StudioArtifact) => (
    <QueryClientProvider client={client}>
      <ArtifactReview
        artifact={snapshot}
        capabilities={capabilities}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
        onDirtyChange={onDirtyChange}
        onBusyChange={onBusyChange}
        copying={copying}
      />
    </QueryClientProvider>
  )
  const rendered = render(review(data))
  return {
    ...rendered,
    rerenderArtifact: (snapshot: StudioArtifact) =>
      rendered.rerender(review(snapshot)),
    onUpdated,
    onDeleted,
    onDirtyChange,
    onBusyChange
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  const values = new Map<string, string>()
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    }
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
describe('ArtifactReview', () => {
  it('blocks discard during a save and ignores an old save after unmount', async () => {
    let finish!: (saved: StudioArtifact) => void
    vi.mocked(studioApi.update).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const first = setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.edit' }))
    fireEvent.change(screen.getByLabelText('studio.artifactTitle'), {
      target: { value: 'First edit' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'studio.save' }))
    await waitFor(() =>
      expect(first.onBusyChange).toHaveBeenLastCalledWith(true)
    )
    act(() => {
      requestNavigation(vi.fn())
    })
    expect(
      screen.getByRole('button', { name: 'studio.discard' })
    ).toBeDisabled()
    first.unmount()
    writeStudioDraft({ ...artifact, title: 'New recovery after navigation' })
    await act(async () => {
      finish({ ...artifact, title: 'First edit' })
      await Promise.resolve()
    })
    expect(first.onUpdated).not.toHaveBeenCalled()
    expect(readStudioDraft(artifact)?.title).toBe(
      'New recovery after navigation'
    )
    expect(first.onBusyChange).toHaveBeenLastCalledWith(false)
  })
  it('locks recovered editing and saving while a copy is pending', () => {
    writeStudioDraft({ ...artifact, title: 'Recovered edit' })
    setup(artifact, true)
    expect(screen.getByRole('button', { name: 'studio.edit' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'studio.save' })).toBeDisabled()
    expect(studioApi.update).not.toHaveBeenCalled()
  })
  it('recovers unsaved work after remount and clears it only after successful save', async () => {
    const first = setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.edit' }))
    fireEvent.change(screen.getByLabelText('studio.artifactTitle'), {
      target: { value: 'Recover my edit' }
    })
    expect(readStudioDraft(artifact)?.title).toBe('Recover my edit')
    first.unmount()
    vi.mocked(studioApi.update).mockResolvedValue({
      ...artifact,
      title: 'Recover my edit',
      updated_at: '2026-10-04T02:00:00Z'
    })
    setup()
    expect(screen.getByText('studio.recoveredDraft')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Recover my edit' })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'studio.save' }))
    await screen.findByText('studio.saved')
    expect(readStudioDraft(artifact)).toBeNull()
  })
  it('retains recovered edits through a conflict and clears them on confirmed discard', async () => {
    writeStudioDraft({ ...artifact, title: 'My older draft' })
    const remote = {
      ...artifact,
      title: 'Remote revision',
      updated_at: '2026-10-04T01:00:00Z'
    }
    vi.mocked(studioApi.update).mockRejectedValue({
      response: { data: { detail: 'Changed in another window' }, status: 409 }
    })
    setup(remote)
    fireEvent.click(screen.getByRole('button', { name: 'studio.save' }))
    await screen.findByText('Changed in another window')
    expect(studioApi.update).toHaveBeenCalledWith(
      artifact.id,
      expect.objectContaining({ expected_updated_at: artifact.updated_at })
    )
    expect(readStudioDraft(remote)?.title).toBe('My older draft')
    act(() => {
      requestNavigation(vi.fn())
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.continueEditing' })
    )
    expect(readStudioDraft(remote)?.title).toBe('My older draft')
    act(() => {
      requestNavigation(vi.fn())
    })
    fireEvent.click(screen.getByRole('button', { name: 'studio.discard' }))
    expect(readStudioDraft(remote)).toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Remote revision' })
    ).toBeInTheDocument()
  })
  it('clears recovered edits when their artifact is explicitly deleted', async () => {
    writeStudioDraft({ ...artifact, title: 'My draft' })
    vi.mocked(studioApi.delete).mockResolvedValue(undefined)
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.delete' }))
    fireEvent.click(
      screen.getAllByRole('button', { name: 'studio.delete' }).at(-1)!
    )
    await waitFor(() => expect(readStudioDraft(artifact)).toBeNull())
  })

  it('refreshes the clean editor when the same artifact receives a new server snapshot', () => {
    const result = setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.edit' }))
    result.rerenderArtifact({
      ...artifact,
      title: 'Updated remotely',
      updated_at: '2026-10-04T01:00:00Z',
      cards: [{ ...artifact.cards[0], body: 'New remote evidence' }]
    })
    expect(screen.getByLabelText('studio.artifactTitle')).toHaveValue(
      'Updated remotely'
    )
    expect(screen.getByLabelText('studio.body')).toHaveValue(
      'New remote evidence'
    )
    expect(screen.queryByText('studio.unsaved')).not.toBeInTheDocument()
  })
  it('preserves dirty edits and their original conflict timestamp across remote refreshes', async () => {
    vi.mocked(studioApi.update).mockRejectedValue({
      response: { data: { detail: 'Changed in another window' }, status: 409 }
    })
    const result = setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.edit' }))
    fireEvent.change(screen.getByLabelText('studio.artifactTitle'), {
      target: { value: 'My local edit' }
    })
    result.rerenderArtifact({
      ...artifact,
      title: 'Remote edit',
      updated_at: '2026-10-04T01:00:00Z',
      cards: [{ ...artifact.cards[0], body: 'New remote evidence' }]
    })
    expect(screen.getByLabelText('studio.artifactTitle')).toHaveValue(
      'My local edit'
    )
    expect(screen.getByLabelText('studio.body')).toHaveValue('Evidence')
    fireEvent.click(screen.getByRole('button', { name: 'studio.save' }))
    await waitFor(() =>
      expect(studioApi.update).toHaveBeenCalledWith(
        'artifact-one',
        expect.objectContaining({ expected_updated_at: artifact.updated_at })
      )
    )
    await screen.findByText('Changed in another window')
    expect(screen.getByLabelText('studio.artifactTitle')).toHaveValue(
      'My local edit'
    )
  })
  it('asks before imperative navigation and supports cancel then discard', () => {
    const navigate = vi.fn()
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.edit' }))
    fireEvent.change(screen.getByLabelText('studio.artifactTitle'), {
      target: { value: 'Unsaved edit' }
    })
    act(() => {
      expect(requestNavigation(navigate)).toBe(false)
    })
    expect(navigate).not.toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.continueEditing' })
    )
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByLabelText('studio.artifactTitle')).toHaveValue(
      'Unsaved edit'
    )
    act(() => {
      requestNavigation(navigate)
    })
    fireEvent.click(screen.getByRole('button', { name: 'studio.discard' }))
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('studio.unsaved')).not.toBeInTheDocument()
  })
  it('intercepts same-origin SPA links, retains edits on cancel, and navigates on discard', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.edit' }))
    fireEvent.change(screen.getByLabelText('studio.artifactTitle'), {
      target: { value: 'Unsaved edit' }
    })
    const link = document.createElement('a')
    link.href = '/search?q=ocean#results'
    link.textContent = 'Search destination'
    document.body.appendChild(link)
    fireEvent.click(link)
    expect(router.push).not.toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.continueEditing' })
    )
    expect(screen.getByLabelText('studio.artifactTitle')).toHaveValue(
      'Unsaved edit'
    )
    fireEvent.click(link)
    fireEvent.click(screen.getByRole('button', { name: 'studio.discard' }))
    expect(router.push).toHaveBeenCalledWith('/search?q=ocean#results')
    link.remove()
  })
  it('allows hash, external, download, new-tab, and modified links without a discard prompt', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.edit' }))
    fireEvent.change(screen.getByLabelText('studio.artifactTitle'), {
      target: { value: 'Unsaved edit' }
    })
    const cases = [
      { href: '#section', target: '', download: false, ctrlKey: false },
      {
        href: 'https://outside.example/research',
        target: '',
        download: false,
        ctrlKey: false
      },
      { href: '/search', target: '_blank', download: false, ctrlKey: false },
      { href: '/search', target: '', download: true, ctrlKey: false },
      { href: '/search', target: '', download: false, ctrlKey: true }
    ]
    for (const item of cases) {
      const link = document.createElement('a')
      link.href = item.href
      link.target = item.target
      if (item.download) link.setAttribute('download', 'research.html')
      // Stop jsdom's unsupported default navigation after capture has observed the click.
      link.addEventListener('click', (event) => event.preventDefault())
      document.body.appendChild(link)
      fireEvent.click(link, { ctrlKey: item.ctrlKey })
      expect(screen.queryByText('studio.discardTitle')).not.toBeInTheDocument()
      link.remove()
    }
    expect(router.push).not.toHaveBeenCalled()
  })
  it('keeps clean paths immediate and removes dirty navigation listeners on unmount', () => {
    const navigate = vi.fn()
    const result = setup()
    expect(requestNavigation(navigate)).toBe(true)
    expect(navigate).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'studio.edit' }))
    fireEvent.change(screen.getByLabelText('studio.artifactTitle'), {
      target: { value: 'Unsaved edit' }
    })
    result.unmount()
    expect(requestNavigation(navigate)).toBe(true)
    expect(navigate).toHaveBeenCalledTimes(2)
  })

  it('saves with a conflict timestamp and removes empty bullet lines', async () => {
    vi.mocked(studioApi.update).mockResolvedValue({
      ...artifact,
      title: 'Edited research',
      updated_at: '2026-10-04T01:00:00Z'
    })
    const result = setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.edit' }))
    fireEvent.change(screen.getByLabelText('studio.artifactTitle'), {
      target: { value: 'Edited research' }
    })
    fireEvent.change(screen.getByLabelText('studio.bullets'), {
      target: { value: '\nA useful point\n\n' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'studio.save' }))
    await waitFor(() =>
      expect(studioApi.update).toHaveBeenCalledWith(
        'artifact-one',
        expect.objectContaining({
          title: 'Edited research',
          expected_updated_at: artifact.updated_at,
          cards: [expect.objectContaining({ bullets: ['A useful point'] })]
        })
      )
    )
    await waitFor(() => expect(result.onUpdated).toHaveBeenCalled())
    expect(result.onDirtyChange).toHaveBeenLastCalledWith(false)
  })
  it('preserves edits after a save conflict and blocks stale-version export', async () => {
    vi.mocked(studioApi.update).mockRejectedValue({
      response: { data: { detail: 'Changed in another window' }, status: 409 }
    })
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.edit' }))
    fireEvent.change(screen.getByLabelText('studio.artifactTitle'), {
      target: { value: 'Keep this edit' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'studio.save' }))
    await screen.findByText('Changed in another window')
    expect(screen.getByLabelText('studio.artifactTitle')).toHaveValue(
      'Keep this edit'
    )
    expect(screen.getByRole('button', { name: 'studio.export' })).toBeDisabled()
    expect(studioApi.export).not.toHaveBeenCalled()
  })
  it('uses the authenticated export API with explicit local narration', async () => {
    vi.mocked(studioApi.export).mockRejectedValue(
      new Error('Renderer unavailable')
    )
    setup({ ...artifact, kind: 'video' })
    fireEvent.change(screen.getByLabelText('studio.export'), {
      target: { value: 'mp4:local' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'studio.export' }))
    await waitFor(() =>
      expect(studioApi.export).toHaveBeenCalledWith(
        'artifact-one',
        'mp4',
        'local'
      )
    )
    await screen.findByText('Renderer unavailable')
    expect(studioApi.export).toHaveBeenCalledTimes(1)
  })
  it('validates section limits before save', () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.edit' }))
    fireEvent.change(screen.getByLabelText('studio.bullets'), {
      target: { value: 'x'.repeat(601) }
    })
    expect(screen.getByRole('alert')).toHaveTextContent('studio.bulletsLimit')
    expect(screen.getByRole('button', { name: 'studio.save' })).toBeDisabled()
  })
  it('deletes only after explicit confirmation', async () => {
    vi.mocked(studioApi.delete).mockResolvedValue(undefined)
    const result = setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.delete' }))
    expect(studioApi.delete).not.toHaveBeenCalled()
    const buttons = screen.getAllByRole('button', { name: 'studio.delete' })
    fireEvent.click(buttons[buttons.length - 1])
    await waitFor(() => expect(result.onDeleted).toHaveBeenCalledTimes(1))
  })
})
