# Creation Studio

Open **Creation studio** in the sidebar, or **Create from notebook** inside a
notebook. Select the sources and notes to use. Only items with extracted text can
be selected. The notebook readiness panel identifies pending, failed, and empty
sources so you can resolve them before creating a draft.

## Create, review, and reuse

1. Choose slides, explainer video, brief, quiz, flashcards, concept groups, or timeline.
2. Enter the subject and select the evidence to include.
3. Use **Source excerpts** for local processing without a model call. Use **AI draft**
   for synthesis, with a registered language model or your transformation/chat default.
4. Open the saved draft. Check claims and references, then edit its title and sections.
5. Save your edits and choose an export format.

The section editor supports **Add section**, **Duplicate section**, **Move earlier**,
**Move later**, and confirmed removal. New sections require a title, substantive
content, and at least one selected source or note before saving. Choose evidence
for each section with its checkboxes. Unsaved recovery includes new sections and
their order, even while a new section is unfinished. Save and copy operations lock
conflicting controls until they finish.

Advanced settings expose audience, language, visual style, and section count.
Source excerpts preserve the input language and do not translate or infer facts.
Short input can produce fewer sections than requested. A concept-group excerpt
organizes passages; it does not establish relationships. A timeline excerpt keeps
source order; it does not infer dates. AI output also requires review.

Quizzes support answer reveal and multiple-choice feedback. Flashcards reveal one
answer at a time. Slides have previous/next controls and scoped keyboard navigation.
Video previews advance through timed scenes, with reduced-motion support.

Drafts retain the selected source IDs, titles, and safe links. These snapshots are
provenance, not a guarantee that every claim follows from its cited source. Source
changes do not automatically regenerate a saved artifact. Unsaved edits are protected
when switching artifacts or notebooks. Concurrent saves return a conflict and retain
your edits. Drafts belong to the installation's existing authentication boundary;
this feature does not introduce per-user access control.

The sidebar and command palette confirm navigation away from unsaved edits. The
editor also keeps recoverable drafts in this browser session across refresh and
browser Back. Recovery retains the original save timestamp, so it cannot silently
overwrite a newer version. Save before sharing or closing the browser session;
drafts are not published automatically. Restricted or full browser storage can
prevent recovery, without interrupting editing.

## Find, copy, import, and recover drafts

The saved-work library searches titles and audience text, filters by format, and
sorts by updated date, creation date, or title. It shows 12 summaries per page and
loads full content when you open a draft. **Refresh** updates the library without
replacing your unsaved edits. **Make a copy** creates a separate draft; the original
keeps its content and timestamps. Save or discard your edits before copying.

Export **JSON** to move a draft between installations. In the destination notebook,
choose **Import JSON**, select the file, review its title, format, section count,
and destination, then confirm **Import draft**. Import creates a fresh identity and
timestamps and makes no model call. The complete request, including metadata,
must be smaller than 1 MB. Import validates version 1 data, section content,
reference metadata, and limits before writing.

Cross-notebook transfers keep source snapshots and show a review notice. Matching
source IDs alone do not establish links between notebooks. Existing snapshots
remain snapshots; import does not verify claims or recreate missing sources.

**Recover from deleted notebooks** shows retained artifacts whose original
notebook is unavailable. You can preview, export, or delete them. Select an existing
notebook and choose **Restore a copy here** to make an editable copy there.
Recovery preserves evidence snapshots and leaves the retained original unchanged.
This uses the installation's existing access boundary and does not isolate users.

## Export formats

| Format | Content |
| --- | --- |
| HTML | Standalone presentation with keyboard controls, references, warnings, and print/PDF support. No remote assets. |
| Markdown | Readable sections, answers, speaker notes, warnings, and references. |
| JSON | Editable structured artifact with provenance and settings. |
| PowerPoint | Editable slides and speaker notes; long text is paginated. Offered for slide drafts. |
| MP4 | 1280 × 720 captioned video with scene timing and source labels. Offered for video drafts. |
| SRT | Captions matching the scene timing, or the local narration timing when selected. |

MP4 is silent by default. **MP4 with local narration** uses espeak-ng, a synthetic
voice with no external speech-provider call. For AI video drafts, speaker notes form
the narration script; source-excerpt drafts read the subject content. Local narration
can extend a scene within the 60-second limit. Longer scripts require editing rather
than silently cutting speech. Narrated SRT uses the same voice and timing calculation.
Caption cues follow scene/speech duration; they are not forced word alignment.
Local narration supports English, Spanish, French, German, Italian, Portuguese,
Dutch, and Polish. Use captioned exports for other languages.

Review exported line breaks, glyphs, and pronunciation. The included DejaVu fonts and
local voice do not cover every language equally. JSON/Markdown retain the original
text when a renderer lacks a glyph. Studio copy currently falls back to English in
all locales; existing translated product screens retain their translations.

## Provider setup

**Models & API keys** explains the supported workflow: save an encrypted server-side
credential, test it, discover/register models, and assign defaults. Studio never asks
the browser to call OpenAI directly. It reuses the installation's existing provider
registry and credential handling. AI generation makes one bounded request; it does
not silently retry or fall back to a second provider. Provider usage may incur charges.

General OpenAI API access uses API keys or supported workload credentials. The
[OpenAI authentication documentation](https://developers.openai.com/api/reference/overview#authentication)
does not establish a general consumer ChatGPT OAuth flow for this application.
ChatGPT subscriptions and API billing are separate; there is no simulated sign-in
button or extraction of another application's tokens.

## Storage and limits

Artifacts are private JSON files under `DATA_FOLDER/studio` (normally `/app/data/studio`
in Docker). The directory uses mode 700 and files use mode 600. Writes are atomic and
guarded across processes. Keep this directory in your existing data-volume backups.
No database migration is required. Generation requests allow 3–20 sections; saved
artifacts can contain 1–20. Each scene lasts 5–60 seconds. Persistence is bounded to
1 MB per artifact and 1,000 artifacts per installation. Two expensive exports can run
concurrently in each API process; additional requests wait for a rendering slot.

The library API returns paginated summaries without section bodies or source text.
Its bounded scan reads one artifact at a time; it is not a persistent search index.
Corrupt files are omitted from the library. Back up the Studio directory with your
notebooks. Deleting a notebook retains its Studio artifacts until you explicitly
delete them, so they still count toward the installation limit.

For a source build, run `uv sync --frozen`, install frontend dependencies, and use the
normal Dockerfile. Pillow, python-pptx, ffmpeg, fonts, and espeak-ng support exports.
Runtime capability checks disable unavailable formats.

## Upgrade an existing installation safely

When the installed backend is newer than this checkout, preserve it with the additive
overlay. Pin `BACKEND_IMAGE` to the exact currently installed image ID or retained
local tag. Do not pull an unpinned replacement as part of this upgrade.

```sh
docker build --pull=false -f docker/Dockerfile.studio \
  --build-arg BACKEND_IMAGE=your-current-backend-image \
  --build-arg SOURCE_REVISION="$(git rev-parse HEAD)" \
  -t open-notebook-creation-studio:local .
```

Change only the application service's image in your existing Compose file. Preserve
its environment, encryption key, mounts, database, and port bindings. Then run:

```sh
docker compose up -d --no-deps --pull never open_notebook
```

Verify the API version, existing notebooks, provider defaults, Studio creation, and
downloads. To roll back, restore the previous image name and run the same Compose
command. Keep the data volume; rollback does not require deleting generated artifacts.
The overlay verifies required export packages and refuses partial route registration.
It preserves the installed backend's dependencies and migration version, and applies
a narrow provider-diagnostic fix that prevents credential-bearing model objects from
being written to debug logs.

## Design decisions

The interface keeps the main task visible: choose evidence, create, review, export.
Audience, style, and timing controls appear when needed. This follows
[progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/).
Source titles, readiness, and saved formats stay visible to reduce recall demands,
following [recognition rather than recall](https://www.nngroup.com/articles/recognition-and-recall/).

Loading, save, validation, and error states use accessible status/alert semantics,
guided by [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
Keyboard shortcuts stay within the relevant preview or table; native controls retain
their behavior. Mobile layouts avoid fixed wide tables, and scene controls observe
[WCAG target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
Automated checks supplement browser inspection; they do not establish every user's
accessibility or comprehension acceptance.
