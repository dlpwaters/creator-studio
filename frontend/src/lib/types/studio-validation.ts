import type { StudioArtifact, StudioCard } from './studio'

export function studioCardError(
  card: StudioCard,
  kind: StudioArtifact['kind']
): string | undefined {
  if (!card.title.trim() || card.title.length > 300)
    return 'studio.titleRequired'
  if (
    card.body.length > 6000 ||
    card.notes.length > 6000 ||
    (card.answer?.length ?? 0) > 6000 ||
    (card.question?.length ?? 0) > 2000
  )
    return 'studio.textLimit'
  const bullets = card.bullets.filter((point) => point.trim())
  if (bullets.length > 16 || bullets.some((point) => point.length > 600))
    return 'studio.bulletsLimit'
  if (
    !Number.isInteger(card.duration_seconds) ||
    card.duration_seconds < 5 ||
    card.duration_seconds > 60
  )
    return 'studio.durationLimit'
  if (
    ['quiz', 'flashcards'].includes(kind) &&
    (!card.question?.trim() || !card.answer?.trim())
  )
    return 'studio.quizRequired'
  if (
    (card.options?.length ?? 0) > 8 ||
    card.options?.some((option) => !option.trim() || option.length > 600)
  )
    return 'studio.optionsLimit'
  if (
    card.options?.length &&
    (card.correct_option == null ||
      !Number.isInteger(card.correct_option) ||
      card.correct_option < 0 ||
      card.correct_option >= card.options.length)
  )
    return 'studio.choiceRequired'
  return undefined
}
export function studioArtifactValid(artifact: StudioArtifact): boolean {
  return (
    !!artifact.title.trim() &&
    artifact.title.length <= 300 &&
    artifact.cards.length > 0 &&
    artifact.cards.length <= 20 &&
    artifact.cards.every((card) => !studioCardError(card, artifact.kind))
  )
}
