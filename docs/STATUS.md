# Research and creation workspace status

The research UI now connects notebooks to a Creation Studio. Users select sources
and notes, generate local excerpts or an explicit AI draft, review and edit it,
then export or study it. Seven formats cover slides, videos, briefs, quizzes,
flashcards, concept groups, and timelines. Exports include editable PowerPoint,
standalone HTML, Markdown, JSON, captioned MP4, and SRT. Optional local synthetic
narration requires no speech-provider call.

Notebook readiness identifies missing text and failed/pending ingestion. Provider
setup explains encrypted credentials, testing, model discovery, and defaults.
The Sources table supports smaller screens, native keyboard controls, and safe
pagination when sorting. Authentication retains notebook deep links. Token
estimation handles long text without spaces. Existing APIs and data remain in place.

## Verification

- Backend: the combined suite and focused export/privacy regressions passed.
- Frontend: 146 tests passed across 26 files.
- TypeScript passed; ESLint has no errors and four existing warnings.
- Editable PowerPoint rendered in LibreOffice. Silent and narrated MP4 passed
  ffprobe checks. Export previews were visually inspected.
- The development browser created and saved a real source-excerpt slide draft,
  with no browser errors or horizontal overflow at desktop size.
- Draft recovery, stale-save conflicts, and navigation confirmation have regression
  coverage. The desktop Studio screen has no automated axe violations.
- Final production build, deployed browser checks, and remote CI are pending.

## Deployment and continuity

The local installation uses a newer backend than this checkout. The additive
`docker/Dockerfile.studio` preserves that backend and its migrations/dependencies,
adds Studio routes and exports, and rebuilds the frontend. Keep the previous image
as rollback and preserve Compose mounts, encryption, environment, and port bindings.
See [Creation Studio](CREATION_STUDIO.md) for usage, limits, and the upgrade recipe.

Work is on `feat/research-creation-studio`; the default branch is unchanged. Local
Compose customization and the private machine guide are excluded from commits.
Deployment evidence and rollback metadata stay ignored under `.harness/deploy/`.

## Acceptance limits

AI output requires source review; provenance does not prove each claim. New Studio
copy uses English fallback in all locales. Local voice and font coverage vary by
language, and captions are not forced word alignment. This release uses existing
installation-wide authentication. Final deployed workflow and provider smoke testing
are pending.
