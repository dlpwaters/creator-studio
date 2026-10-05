# Research and creation workspace status

The research UI now connects notebooks to a Creation Studio. Users select sources
and notes, generate local excerpts or an explicit AI draft, review and edit it,
then export or study it. Seven formats cover slides, videos, briefs, quizzes,
flashcards, concept groups, and timelines. Exports include editable PowerPoint,
standalone HTML, Markdown, JSON, captioned MP4, and SRT. Optional local synthetic
narration requires no speech-provider call.

The saved-work library now searches and filters paginated summaries, loads full
content on selection, and collapses during review. Filters survive reopening.
Drafts support independent copies, validated JSON import with preview, and recovery
from deleted notebooks. Cross-notebook transfers preserve evidence snapshots with
explicit review notices. Sections can be added, duplicated, moved, removed, and
assigned sources or notes. Unfinished new sections survive browser-session recovery.

Notebook readiness identifies missing text and failed/pending ingestion. Provider
setup explains encrypted credentials, testing, model discovery, and defaults.
The Sources table supports smaller screens, native keyboard controls, and safe
pagination when sorting. Authentication retains notebook deep links. Token
estimation handles long text without spaces. Existing APIs and data remain in place.
Dirty note drafts also survive background refetch. Search/Ask deep links dispatch
once with the current query. Stale source/insight responses no longer replace a
newer view. Studio save, copy, and navigation guards prevent conflicting edits and
ignore callbacks from unmounted reviews.

## Verification

- Backend: 330 tests passed, including export, concurrency, privacy, transfer,
  orphan recovery, pagination, and API regressions.
- Frontend: 206 tests passed across 35 files. Focused checks also cover keyboard
  focus restoration when draft loading temporarily disables the library; the
  deployed phone browser confirmed focus returns to **Browse saved work**.
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
- The refinement pass exercised real copy, duplicate/reorder, confirmed section
  removal, a cited new section, unfinished-section recovery after refresh, JSON
  download/import, deleted-notebook restoration, and library pagination/clamping.
  Import, recovery, library, and phone-editor screens had zero automated WCAG AA
  axe violations. Desktop light/dark and 390-pixel phone layouts were inspected.
  The disposable notebook and five temporary artifacts were removed. One editable
  tutorial example remains; the original eight artifacts are unchanged. This pass
  made no paid model or speech-provider calls.
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

The deployed application image is `open-notebook-creation-studio:506acb5`, built
from source commit `506acb5ff05eb86278e55611174104514090d1c2` on the retained
`open-notebook-research-ui:1eebcf4` base. Live checks confirmed the original
notebook metadata/counts, provider defaults, backend version, database image,
mounts, and restart policies. The new **Studio tour** notebook holds synthetic
sample material and nine example artifacts. Local example exports are in
`data/studio-showcase/` and are excluded from Git.

Work is on `feat/research-creation-studio` in [PR #2](https://github.com/dlpwaters/open-notebook/pull/2).
The default branch is unchanged. Local Compose customization and the private
machine guide are excluded from commits.
Deployment evidence and rollback metadata stay ignored under `.harness/deploy/`.
On this machine, run `.harness/deploy/studio/rollback.sh` from the checkout to
restore the retained previous application image without recreating the database.
For rollback to the first Studio milestone, use
`.harness/deploy/studio/rollback-refinement.sh`; its retained image is
`open-notebook-creation-studio:1e10fb7`. Deployment and QA evidence remain local and
ignored. The latest documentation commit may follow the deployed source commit;
application code is the same.

## Acceptance limits

AI output requires source review; provenance does not prove each claim. New Studio
copy uses English fallback in all locales. Local voice and font coverage vary by
language, and captions are not forced word alignment. Pronunciation, comprehension,
and source accuracy still need human review. This release uses existing
installation-wide authentication and supported server-side provider credentials;
it does not add consumer ChatGPT OAuth or multi-user isolation.
