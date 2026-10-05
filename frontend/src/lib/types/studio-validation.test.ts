import { describe, expect, it } from 'vitest'
import type { StudioArtifact, StudioCard } from './studio'
import { studioArtifactValid, studioCardError } from './studio-validation'

const section: StudioCard = {
  id: 'card-one',
  title: 'A title',
  body: 'Substantive evidence',
  bullets: [],
  notes: '',
  source_ids: ['source:one'],
  duration_seconds: 15
}
const artifact: StudioArtifact = {
  id: 'artifact-one',
  notebook_id: 'notebook:one',
  kind: 'slides',
  title: 'Research',
  audience: 'Readers',
  style: 'editorial',
  language: 'en-US',
  created_at: '',
  updated_at: '',
  source_ids: ['source:one'],
  note_ids: ['note:one'],
  sources: [],
  cards: [section],
  generation: 'extractive',
  warnings: []
}
describe('Studio save validation', () => {
  it('requires substantive content beyond the section title', () => {
    expect(
      studioCardError(
        { ...section, body: '  ', notes: '\n', bullets: [' '] },
        'slides',
        ['source:one']
      )
    ).toBe('studio.sectionContentRequired')
    expect(
      studioCardError(
        { ...section, body: '', notes: 'Narration is content' },
        'slides',
        ['source:one']
      )
    ).toBeUndefined()
  })
  it('requires nonempty permitted references, including selected notes', () => {
    expect(
      studioArtifactValid({
        ...artifact,
        cards: [{ ...section, source_ids: [] }]
      })
    ).toBe(false)
    expect(
      studioArtifactValid({
        ...artifact,
        cards: [{ ...section, source_ids: ['source:foreign'] }]
      })
    ).toBe(false)
    expect(
      studioArtifactValid({
        ...artifact,
        cards: [{ ...section, source_ids: ['note:one'] }]
      })
    ).toBe(true)
  })
  it('rejects duplicate or blank IDs and card counts outside the bounds', () => {
    expect(
      studioArtifactValid({ ...artifact, cards: [section, { ...section }] })
    ).toBe(false)
    expect(
      studioArtifactValid({ ...artifact, cards: [{ ...section, id: ' ' }] })
    ).toBe(false)
    expect(studioArtifactValid({ ...artifact, cards: [] })).toBe(false)
    expect(
      studioArtifactValid({
        ...artifact,
        cards: Array.from({ length: 21 }, (_, i) => ({
          ...section,
          id: `card-${i}`
        }))
      })
    ).toBe(false)
    expect(studioArtifactValid(artifact)).toBe(true)
  })
  it('requires real questions, answers, and valid answer indexes for study cards', () => {
    expect(studioArtifactValid({ ...artifact, kind: 'quiz' })).toBe(false)
    const quiz = {
      ...section,
      question: 'What was measured?',
      answer: 'Temperature',
      options: ['Temperature', 'Pressure'],
      correct_option: 0
    }
    expect(
      studioArtifactValid({ ...artifact, kind: 'quiz', cards: [quiz] })
    ).toBe(true)
    expect(
      studioArtifactValid({
        ...artifact,
        kind: 'quiz',
        cards: [{ ...quiz, correct_option: 2 }]
      })
    ).toBe(false)
    expect(
      studioArtifactValid({
        ...artifact,
        kind: 'flashcards',
        cards: [{ ...quiz, question: ' ' }]
      })
    ).toBe(false)
  })
})
