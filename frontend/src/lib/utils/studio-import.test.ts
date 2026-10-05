import { describe, expect, it } from 'vitest'
import { parseStudioImport, STUDIO_IMPORT_BYTES } from './studio-import'

const exported = {
  id: 'a'.repeat(32),
  notebook_id: 'notebook:one',
  kind: 'slides',
  title: 'Evidence',
  cards: [{ id: 'section-1', title: 'A section' }],
  sources: [{ id: 'source:one', title: 'Original source' }]
}
describe('Studio import preview', () => {
  it('previews a JSON export without discarding fields needed by server validation', () => {
    const data = {
      ...exported,
      warnings: ['Review claims'],
      custom: 'server must reject this'
    }
    const preview = parseStudioImport(JSON.stringify(data))
    expect(preview.title).toBe('Evidence')
    expect(preview.cardCount).toBe(1)
    expect(preview.references).toEqual(exported.sources)
    expect(preview.artifact).toEqual(data)
  })
  it.each([
    'null',
    '[]',
    '{}',
    '{broken',
    JSON.stringify({ ...exported, cards: [] }),
    JSON.stringify({ ...exported, sources: [null] })
  ])('rejects unsafe preview shapes', (raw) => {
    expect(() => parseStudioImport(raw)).toThrow('studio.importInvalid')
  })
  it('counts UTF-8 bytes before parsing so multibyte input cannot bypass the file limit', () => {
    const raw = JSON.stringify({
      ...exported,
      padding: '😀'.repeat(STUDIO_IMPORT_BYTES / 4)
    })
    expect(raw.length).toBeLessThan(STUDIO_IMPORT_BYTES)
    expect(() => parseStudioImport(raw)).toThrow('studio.importLimit')
  })
})
