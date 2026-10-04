import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StudioArtifact } from '@/lib/types/studio'
import { readStudioDraft, writeStudioDraft } from './studio-draft'

const artifact: StudioArtifact = {
  id: 'artifact-one',
  notebook_id: 'notebook:one',
  kind: 'slides',
  title: 'Research',
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
      title: 'Evidence',
      body: 'Research body',
      bullets: [],
      notes: '',
      source_ids: ['source:one'],
      duration_seconds: 5
    }
  ]
}
const key = 'open-notebook:studio-draft:artifact-one'
beforeEach(() => {
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
  vi.unstubAllGlobals()
})
describe('session Studio draft validation', () => {
  it('preserves the original timestamp against a newer server snapshot', () => {
    writeStudioDraft({ ...artifact, title: 'Local revision' })
    const recovered = readStudioDraft({
      ...artifact,
      title: 'Remote revision',
      updated_at: '2026-10-04T01:00:00Z'
    })
    expect(recovered?.title).toBe('Local revision')
    expect(recovered?.updated_at).toBe(artifact.updated_at)
  })
  it.each([
    'invalid JSON',
    JSON.stringify({ version: 1 }),
    'x'.repeat(512_001)
  ])('ignores malformed or oversized storage without deleting it', (raw) => {
    sessionStorage.setItem(key, raw)
    expect(readStudioDraft(artifact)).toBeNull()
    expect(sessionStorage.getItem(key)).toBe(raw)
  })
  it('rejects mismatched notebooks, unknown cards, and foreign citations', () => {
    writeStudioDraft(artifact)
    const value = JSON.parse(sessionStorage.getItem(key)!)
    sessionStorage.setItem(
      key,
      JSON.stringify({ ...value, notebook_id: 'notebook:other' })
    )
    expect(readStudioDraft(artifact)).toBeNull()
    sessionStorage.setItem(
      key,
      JSON.stringify({
        ...value,
        cards: [{ ...value.cards[0], id: 'unknown-card' }]
      })
    )
    expect(readStudioDraft(artifact)).toBeNull()
    sessionStorage.setItem(
      key,
      JSON.stringify({
        ...value,
        cards: [{ ...value.cards[0], source_ids: ['source:other'] }]
      })
    )
    expect(readStudioDraft(artifact)).toBeNull()
  })
  it('strips unknown local fields before any restored card can reach a save', () => {
    writeStudioDraft(artifact)
    const value = JSON.parse(sessionStorage.getItem(key)!)
    value.cards[0].unexpected = 'untrusted'
    value.model_id = 'unknown-model'
    sessionStorage.setItem(key, JSON.stringify(value))
    expect(readStudioDraft(artifact)?.cards[0]).not.toHaveProperty('unexpected')
    expect(readStudioDraft(artifact)?.model_id).toBeUndefined()
  })
  it('catches storage restrictions and quota failures without breaking editing', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('Blocked')
      },
      setItem: () => {
        throw new Error('Quota')
      }
    })
    expect(() => writeStudioDraft(artifact)).not.toThrow()
    expect(readStudioDraft(artifact)).toBeNull()
  })
})
