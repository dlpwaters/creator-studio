import type { StudioKind } from '@/lib/types/studio'

export const STUDIO_IMPORT_BYTES = 1_000_000
const kinds: StudioKind[] = [
  'slides',
  'video',
  'brief',
  'quiz',
  'flashcards',
  'mindmap',
  'timeline'
]
export interface StudioImportPreview {
  artifact: Record<string, unknown>
  title: string
  kind: StudioKind
  cardCount: number
  references: { id: string; title: string }[]
}

/** Preview known fields locally. The server validates the complete document before saving. */
export function parseStudioImport(raw: string): StudioImportPreview {
  if (new TextEncoder().encode(raw).byteLength >= STUDIO_IMPORT_BYTES)
    throw new Error('studio.importLimit')
  let value: Record<string, unknown>
  try {
    value = JSON.parse(raw)
  } catch {
    throw new Error('studio.importInvalid')
  }
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    typeof value.id !== 'string' ||
    !/^[0-9a-f]{32}$/.test(value.id) ||
    typeof value.title !== 'string' ||
    !value.title.trim() ||
    value.title.length > 300 ||
    typeof value.kind !== 'string' ||
    !kinds.includes(value.kind as StudioKind) ||
    typeof value.notebook_id !== 'string' ||
    value.notebook_id.length > 200 ||
    !Array.isArray(value.cards) ||
    !value.cards.length ||
    value.cards.length > 20 ||
    !Array.isArray(value.sources) ||
    !value.sources.length ||
    value.sources.length > 150 ||
    !value.sources.every(
      (source) =>
        source &&
        typeof source === 'object' &&
        typeof source.id === 'string' &&
        source.id.length <= 200 &&
        typeof source.title === 'string' &&
        source.title.length <= 300
    )
  )
    throw new Error('studio.importInvalid')
  return {
    artifact: value,
    title: value.title,
    kind: value.kind as StudioKind,
    cardCount: value.cards.length,
    references: value.sources.map((source) => ({
      id: source.id,
      title: source.title
    }))
  }
}
