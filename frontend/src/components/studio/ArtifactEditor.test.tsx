import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtifactEditor } from './ArtifactEditor'
import { studioArtifactValid } from '@/lib/types/studio-validation'
import type { StudioArtifact, StudioCard } from '@/lib/types/studio'

const card = (id: string, title: string): StudioCard => ({
  id,
  title,
  body: `${title} body`,
  bullets: ['Point one', 'Point two'],
  notes: 'Narration',
  source_ids: ['source:one', 'note:one'],
  duration_seconds: 27,
  question: 'A question?',
  answer: 'An answer',
  options: ['One', 'Two'],
  correct_option: 1
})
const fixture: StudioArtifact = {
  id: 'artifact-one',
  notebook_id: 'notebook:one',
  kind: 'slides',
  title: 'Research',
  audience: 'Readers',
  style: 'editorial',
  language: 'en-US',
  created_at: '2026-10-04T00:00:00Z',
  updated_at: '2026-10-04T00:00:00Z',
  source_ids: ['source:one', 'source:two'],
  note_ids: ['note:one'],
  generation: 'extractive',
  warnings: [],
  sources: [
    { id: 'source:one', title: 'First source' },
    { id: 'source:two', title: 'Second source' },
    { id: 'note:one', title: 'Research note' },
    { id: 'source:foreign', title: 'Unselected source' }
  ],
  cards: [card('card-one', 'First section'), card('card-two', 'Second section')]
}
function setup(initial = fixture, disabled = false) {
  const changed = vi.fn()
  let snapshot = initial
  function Harness() {
    const [artifact, setArtifact] = useState(initial)
    return (
      <ArtifactEditor
        artifact={artifact}
        disabled={disabled}
        onChange={(value) => {
          snapshot = value
          changed(value)
          setArtifact(value)
        }}
      />
    )
  }
  render(<Harness />)
  return { changed, snapshot: () => snapshot }
}
afterEach(cleanup)
describe('section management and evidence editing', () => {
  it('duplicates all fields with a fresh ID, then reorders without changing the selected section', () => {
    const result = setup()
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.duplicateSection' })
    )
    const duplicate = result.snapshot().cards[1]
    expect(duplicate).toEqual({ ...fixture.cards[0], id: duplicate.id })
    expect(duplicate.id).not.toBe(fixture.cards[0].id)
    expect(new Set(result.snapshot().cards.map((item) => item.id)).size).toBe(3)
    expect(duplicate.bullets).not.toBe(fixture.cards[0].bullets)
    expect(duplicate.source_ids).not.toBe(fixture.cards[0].source_ids)
    expect(duplicate.options).not.toBe(fixture.cards[0].options)
    expect(screen.getByLabelText('studio.cardTitle')).toHaveFocus()
    fireEvent.change(screen.getByLabelText('studio.cardTitle'), {
      target: { value: 'Duplicated section' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'studio.moveLater' }))
    expect(result.snapshot().cards[2].id).toBe(duplicate.id)
    expect(screen.getByLabelText('studio.cardTitle')).toHaveValue(
      'Duplicated section'
    )
    fireEvent.click(screen.getByRole('button', { name: 'studio.moveEarlier' }))
    expect(result.snapshot().cards[1]).toEqual({
      ...duplicate,
      title: 'Duplicated section'
    })
    expect(result.snapshot().cards[0]).toEqual(fixture.cards[0])
    expect(result.snapshot().cards[2]).toEqual(fixture.cards[1])
  })
  it('creates an explicitly blank, uncited section and permits saving only after it is filled and cited', () => {
    const result = setup()
    fireEvent.click(screen.getByRole('button', { name: 'studio.addSection' }))
    const added = result.snapshot().cards.at(-1)!
    expect(added.title).toBe('')
    expect(added.body).toBe('')
    expect(added.source_ids).toEqual([])
    expect(screen.getByLabelText('studio.cardTitle')).toHaveFocus()
    expect(studioArtifactValid(result.snapshot())).toBe(false)
    fireEvent.change(screen.getByLabelText('studio.cardTitle'), {
      target: { value: 'New section' }
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'studio.sectionContentRequired'
    )
    fireEvent.change(screen.getByLabelText('studio.body'), {
      target: { value: 'New source-grounded explanation' }
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'studio.sectionCitationRequired'
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'Research note' }))
    expect(result.snapshot().cards.at(-1)?.source_ids).toEqual(['note:one'])
    expect(studioArtifactValid(result.snapshot())).toBe(true)
  })
  it('requires confirmation before removal and selects the adjacent surviving section', () => {
    const result = setup()
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.removeSection' })
    )
    expect(result.changed).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'studio.keepSection' }))
    expect(result.snapshot().cards).toHaveLength(2)
    fireEvent.click(
      screen.getByRole('button', { name: 'studio.removeSection' })
    )
    fireEvent.click(
      screen.getAllByRole('button', { name: 'studio.removeSection' }).at(-1)!
    )
    expect(result.snapshot().cards).toEqual([fixture.cards[1]])
    expect(screen.getByLabelText('studio.cardTitle')).toHaveValue(
      'Second section'
    )
    expect(screen.getByLabelText('studio.cardTitle')).toHaveFocus()
    expect(
      screen.getByRole('button', { name: 'studio.removeSection' })
    ).toBeDisabled()
  })
  it('retains selected identity when moving an existing section earlier and later', () => {
    const result = setup()
    fireEvent.click(screen.getByRole('button', { name: '2. Second section' }))
    fireEvent.click(screen.getByRole('button', { name: 'studio.moveEarlier' }))
    expect(result.snapshot().cards.map((item) => item.id)).toEqual([
      'card-two',
      'card-one'
    ])
    expect(
      screen.getByRole('button', { name: '1. Second section' })
    ).toHaveAttribute('aria-current', 'step')
    fireEvent.click(screen.getByRole('button', { name: 'studio.moveLater' }))
    expect(result.snapshot().cards).toEqual(fixture.cards)
    expect(screen.getByLabelText('studio.cardTitle')).toHaveValue(
      'Second section'
    )
  })
  it('enforces the one-to-twenty-section bounds', () => {
    const result = setup({
      ...fixture,
      cards: Array.from({ length: 20 }, (_, i) =>
        card(`card-${i}`, `Section ${i}`)
      )
    })
    expect(
      screen.getByRole('button', { name: 'studio.addSection' })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'studio.duplicateSection' })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'studio.moveEarlier' })
    ).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '20. Section 19' }))
    expect(
      screen.getByRole('button', { name: 'studio.moveLater' })
    ).toBeDisabled()
    expect(result.changed).not.toHaveBeenCalled()
  })
  it('offers only selected artifact evidence and updates citations without changing content', () => {
    const result = setup()
    expect(
      screen.queryByRole('checkbox', { name: 'Unselected source' })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'First source' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Research note' }))
    expect(studioArtifactValid(result.snapshot())).toBe(false)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Second source' }))
    expect(result.snapshot().cards[0]).toEqual({
      ...fixture.cards[0],
      source_ids: ['source:two']
    })
    expect(studioArtifactValid(result.snapshot())).toBe(true)
  })
  it('respects a disabled editor for local section operations and evidence changes', () => {
    const result = setup(fixture, true)
    expect(
      screen.getByRole('button', { name: 'studio.addSection' })
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'studio.duplicateSection' })
    ).toBeDisabled()
    expect(
      screen.getByRole('checkbox', { name: 'First source' })
    ).toBeDisabled()
    expect(result.changed).not.toHaveBeenCalled()
  })
})
