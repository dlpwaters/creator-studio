import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactPreview } from './ArtifactPreview'
import { safeSourceUrl } from './StudioPrimitives'
import type { StudioArtifact } from '@/lib/types/studio'

export const artifactFixture: StudioArtifact = {
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
  sources: [
    {
      id: 'source:one',
      title: 'Field research',
      url: 'https://example.com/research'
    }
  ],
  cards: Array.from({ length: 3 }, (_, i) => ({
    id: `card-${i}`,
    title: `Topic ${i + 1}`,
    body: `Evidence ${i + 1}`,
    bullets: [],
    notes: `Narration ${i + 1}`,
    source_ids: ['source:one'],
    duration_seconds: 5,
    question: `Question ${i + 1}`,
    answer: `Answer ${i + 1}`
  }))
}
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
describe('ArtifactPreview', () => {
  it('navigates slides and retains source references', () => {
    render(<ArtifactPreview artifact={artifactFixture} />)
    expect(screen.getByRole('heading', { name: 'Topic 1' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Field research' })
    ).toHaveAttribute('href', 'https://example.com/research')
    fireEvent.click(screen.getByRole('button', { name: 'studio.next' }))
    expect(screen.getByRole('heading', { name: 'Topic 2' })).toBeInTheDocument()
  })
  it('reveals flashcard answers only on demand and resets on navigation', () => {
    render(
      <ArtifactPreview artifact={{ ...artifactFixture, kind: 'flashcards' }} />
    )
    expect(screen.queryByText('Answer 1')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'studio.reveal' }))
    expect(screen.getByText('Answer 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'studio.next' }))
    expect(screen.queryByText('Answer 2')).not.toBeInTheDocument()
  })
  it('checks multiple choice without displaying the answer before selection', () => {
    const cards = [
      {
        ...artifactFixture.cards[0],
        options: ['Wrong choice', 'Right choice'],
        correct_option: 1
      }
    ]
    render(
      <ArtifactPreview artifact={{ ...artifactFixture, kind: 'quiz', cards }} />
    )
    expect(
      screen.getByRole('button', { name: 'studio.checkAnswer' })
    ).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: 'Right choice' }))
    fireEvent.click(screen.getByRole('button', { name: 'studio.checkAnswer' }))
    expect(screen.getByRole('status')).toHaveTextContent('studio.correct')
    expect(screen.getByText('Answer 1')).toBeInTheDocument()
  })
  it('plays a storyboard with bounded timers and cleans up on unmount', () => {
    vi.useFakeTimers()
    const result = render(
      <ArtifactPreview artifact={{ ...artifactFixture, kind: 'video' }} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'studio.play' }))
    expect(vi.getTimerCount()).toBe(1)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByRole('heading', { name: 'Topic 2' })).toBeInTheDocument()
    result.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('disables automatic playback when reduced motion is enabled', () => {
    vi.mocked(window.matchMedia).mockReturnValueOnce({
      matches: true,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })
    render(<ArtifactPreview artifact={{ ...artifactFixture, kind: 'video' }} />)
    expect(screen.getByRole('button', { name: 'studio.play' })).toBeDisabled()
    expect(screen.getByText('studio.reducedMotion')).toBeInTheDocument()
  })
  it('renders concept groups and a timeline with every real section', () => {
    const result = render(
      <ArtifactPreview artifact={{ ...artifactFixture, kind: 'mindmap' }} />
    )
    expect(screen.getAllByRole('heading')).toHaveLength(3)
    expect(screen.getByText('studio.conceptMapHelp')).toBeInTheDocument()
    result.rerender(
      <ArtifactPreview artifact={{ ...artifactFixture, kind: 'timeline' }} />
    )
    expect(screen.getAllByRole('heading')).toHaveLength(3)
    expect(screen.getByText('studio.timelineHelp')).toBeInTheDocument()
  })
  it('rejects unsafe provenance URLs', () => {
    expect(safeSourceUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeSourceUrl('file:///etc/passwd')).toBeUndefined()
    expect(safeSourceUrl('https://example.com/path')).toBe(
      'https://example.com/path'
    )
  })
})
