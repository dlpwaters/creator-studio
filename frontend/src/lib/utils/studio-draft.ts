import type { StudioArtifact, StudioCard } from '@/lib/types/studio'

const PREFIX = 'open-notebook:studio-draft:'
const MAX_BYTES = 512_000
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max
const textList = (
  value: unknown,
  maxCount: number,
  maxLength: number
): value is string[] =>
  Array.isArray(value) &&
  value.length <= maxCount &&
  value.every((item) => text(item, maxLength))
function validCard(
  value: unknown,
  artifact: StudioArtifact
): value is StudioCard {
  if (!value || typeof value !== 'object') return false
  const card = value as StudioCard
  const allowedSources = new Set([...artifact.source_ids, ...artifact.note_ids])
  return (
    text(card.id, 200) &&
    !!card.id.trim() &&
    card.id === card.id.trim() &&
    text(card.title, 300) &&
    text(card.body, 6000) &&
    text(card.notes, 6000) &&
    textList(card.bullets, 16, 600) &&
    textList(card.source_ids, 150, 200) &&
    card.source_ids.every((id) => allowedSources.has(id)) &&
    Number.isInteger(card.duration_seconds) &&
    card.duration_seconds >= 5 &&
    card.duration_seconds <= 60 &&
    (card.question == null || text(card.question, 2000)) &&
    (card.answer == null || text(card.answer, 6000)) &&
    (card.options == null || textList(card.options, 8, 600)) &&
    (card.correct_option == null ||
      (Number.isInteger(card.correct_option) &&
        card.correct_option >= 0 &&
        card.correct_option < (card.options?.length ?? 0)))
  )
}

/** Keep only editable fields locally. The original timestamp remains the save conflict boundary. */
export function writeStudioDraft(artifact: StudioArtifact): void {
  try {
    if (typeof sessionStorage === 'undefined') return
    const value = JSON.stringify({
      version: 1,
      artifact_id: artifact.id,
      notebook_id: artifact.notebook_id,
      kind: artifact.kind,
      updated_at: artifact.updated_at,
      title: artifact.title,
      cards: artifact.cards
    })
    if (value.length <= MAX_BYTES)
      sessionStorage.setItem(PREFIX + artifact.id, value)
  } catch {
    /* Storage restrictions or quota must not interrupt editing. */
  }
}
export function readStudioDraft(
  artifact: StudioArtifact
): StudioArtifact | null {
  try {
    if (typeof sessionStorage === 'undefined') return null
    const raw = sessionStorage.getItem(PREFIX + artifact.id)
    if (!raw || raw.length > MAX_BYTES) return null
    const value = JSON.parse(raw)
    if (
      !value ||
      value.version !== 1 ||
      value.artifact_id !== artifact.id ||
      value.notebook_id !== artifact.notebook_id ||
      value.kind !== artifact.kind ||
      !text(value.updated_at, 100) ||
      !Number.isFinite(Date.parse(value.updated_at)) ||
      !text(value.title, 300) ||
      !Array.isArray(value.cards) ||
      !value.cards.length ||
      value.cards.length > 20 ||
      !value.cards.every((card: unknown) => validCard(card, artifact))
    )
      return null
    if (
      new Set(value.cards.map((card: StudioCard) => card.id)).size !==
      value.cards.length
    )
      return null
    // Reconstruct known fields so unexpected local properties cannot reach a PATCH request.
    const cards: StudioCard[] = value.cards.map((card: StudioCard) => ({
      id: card.id,
      title: card.title,
      body: card.body,
      bullets: card.bullets,
      notes: card.notes,
      source_ids: card.source_ids,
      duration_seconds: card.duration_seconds,
      question: card.question ?? null,
      answer: card.answer ?? null,
      options: card.options ?? [],
      correct_option: card.correct_option ?? null
    }))
    return {
      ...artifact,
      updated_at: value.updated_at,
      title: value.title,
      cards
    }
  } catch {
    return null
  }
}
export function clearStudioDraft(id: string): void {
  try {
    if (typeof sessionStorage !== 'undefined')
      sessionStorage.removeItem(PREFIX + id)
  } catch {
    /* Clearing a draft must not block an explicit action. */
  }
}
