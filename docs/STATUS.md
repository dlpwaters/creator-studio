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

- Backend: 299 tests passed, including export, concurrency, privacy, and API regressions.
- Frontend: 148 tests passed across 26 files.
- TypeScript passed; ESLint has no errors and four existing warnings.
- The production frontend and additive runtime image built successfully.
- Deployed browser checks covered desktop and 390-pixel phone layouts, light and
  dark themes, source selection, editing/saving, quiz reveal, and real downloads.
  Studio, provider settings, and standalone HTML had no automated WCAG AA axe
  violations on the checked screens. No browser errors or horizontal overflow
  appeared during these workflows.
- Browser Back recovered an unsaved tutorial edit. Discard confirmation removed
  that temporary edit. Stale-save conflicts and navigation guards have regression
  coverage; the original notebook was not used for mutation tests.
- All seven source-excerpt formats were generated from a synthetic tutorial source.
  One explicit AI request generated a three-scene explainer using the existing
  transformation default. Its script was reviewed and edited before export.
- Final editable PowerPoint rendered in LibreOffice. The narrated MP4 contains
  H.264 video at 1280 × 720, AAC audio, and 66 seconds of scene/caption timing.
  Frames and slide layouts were visually inspected. Audio listening was unavailable.
- GitHub backend/frontend test jobs and the regular Docker image build passed.
  CI installs renderer prerequisites so
  video and narration checks exercise the actual tools.

## Deployment and continuity

The local installation uses backend 1.14.0, newer than this checkout. The additive
`docker/Dockerfile.studio` preserves that backend and its migrations/dependencies,
adds Studio routes and exports, and rebuilds the frontend. Keep the previous image
as rollback and preserve Compose mounts, encryption, environment, and port bindings.
See [Creation Studio](CREATION_STUDIO.md) for usage, limits, and the upgrade recipe.

The deployed application image is `open-notebook-creation-studio:1e10fb7`, built
from source commit `1e10fb774dc5334897e3ba2c78c3305765281c1e` on the retained
`open-notebook-research-ui:1eebcf4` base. Live checks confirmed the original
notebook metadata/counts, provider defaults, backend version, database image,
mounts, and restart policies. The new **Studio tour** notebook holds synthetic
sample material and eight example artifacts. Local example exports are in
`data/studio-showcase/` and are excluded from Git.

Work is on `feat/research-creation-studio` in [PR #2](https://github.com/dlpwaters/open-notebook/pull/2).
The default branch is unchanged. Local Compose customization and the private
machine guide are excluded from commits.
Deployment evidence and rollback metadata stay ignored under `.harness/deploy/`.
On this machine, run `.harness/deploy/studio/rollback.sh` from the checkout to
restore the retained previous application image without recreating the database.

## Acceptance limits

AI output requires source review; provenance does not prove each claim. New Studio
copy uses English fallback in all locales. Local voice and font coverage vary by
language, and captions are not forced word alignment. Pronunciation, comprehension,
and source accuracy still need human review. This release uses existing
installation-wide authentication and supported server-side provider credentials;
it does not add consumer ChatGPT OAuth or multi-user isolation.
