# Creator Studio

[![Tests](https://github.com/dlpwaters/creator-studio/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/dlpwaters/creator-studio/actions/workflows/test.yml)
[![Build](https://github.com/dlpwaters/creator-studio/actions/workflows/build-dev.yml/badge.svg?branch=main)](https://github.com/dlpwaters/creator-studio/actions/workflows/build-dev.yml)
[![MIT license](https://img.shields.io/github/license/dlpwaters/creator-studio)](LICENSE)

**Research a subject, turn your sources into an editable draft, and export something useful.**

Creator Studio is a self-hosted research and creation workspace built on
[Open Notebook](https://github.com/lfnovo/open-notebook). Organize sources and notes,
search and chat with your research, then create slide decks, explainer videos,
briefs, and study materials in the same workspace.

Start with local source excerpts or explicitly request an AI draft from a configured
provider. Review the evidence, edit the result, and save or export it. Local
source-excerpt generation and local video narration make no model-provider calls;
ingestion, embeddings, chat, podcasts, and AI drafts can use external services,
depending on your configuration.

[Get started](#get-started) · [Creation Studio guide](docs/CREATION_STUDIO.md) ·
[Project status](docs/STATUS.md) · [Report an issue](https://github.com/dlpwaters/creator-studio/issues)

## What you can create

| Draft | Review and use | Export |
| --- | --- | --- |
| Slide deck | Edit sections and speaker notes; present with keyboard controls | PowerPoint, HTML, Markdown, JSON |
| Explainer video | Review timed scenes, captions, and narration text | MP4, SRT, HTML, Markdown, JSON |
| Brief | Review a concise document with source references | HTML, Markdown, JSON |
| Quiz | Reveal answers and check multiple-choice responses | HTML, Markdown, JSON |
| Flashcards | Study one question and answer at a time | HTML, Markdown, JSON |
| Concept groups | Organize related source passages for review | HTML, Markdown, JSON |
| Timeline | Review a sequence; verify dates against the sources | HTML, Markdown, JSON |

All drafts support section editing, evidence selection, independent copies,
searchable saved work, and JSON transfer between installations. You can recover
retained drafts from deleted notebooks by restoring a copy into an existing
notebook. Browser-session recovery protects unfinished edits, including new
sections. Save important work before closing the browser session.

MP4 exports are silent by default. Optional local narration uses espeak-ng and
does not call a speech provider. HTML exports are standalone files without remote
assets and support printing. See the [Studio guide](docs/CREATION_STUDIO.md) for
format-specific behavior, language support, and limits.

## Research workspace

- Collect PDFs, web pages, audio, video, and other supported documents in notebooks.
- Track source readiness before selecting evidence for a draft.
- Write notes, use full-text or vector search, and chat with selected context.
- Configure multiple AI providers, including OpenAI, Anthropic, Google, Ollama,
  and compatible endpoints, through the existing provider registry.
- Use content transformations and the inherited multi-speaker podcast workflow.
- Work in light or dark themes with responsive layouts and keyboard controls.

The stack is Python/FastAPI, Next.js/React, and SurrealDB. Internal package names,
environment variables, and the `open_notebook` service name remain compatible with
Open Notebook. The GitHub project is named Creator Studio.

## Get started

### New installation with Docker

You need Git, Docker with Compose v2, and a shell with OpenSSL. These commands are
for Linux, macOS, or WSL. The build downloads dependencies and can take several
minutes. You do not need host Python or Node.js for this path.

**Already running Open Notebook?** Use the
[existing-installation upgrade guide](docs/CREATION_STUDIO.md#upgrade-an-existing-installation-safely)
instead. The fresh-install recipe creates separate Docker volumes; it does not
move your existing notebooks or credentials.

1. Clone this repository:

   ```sh
   git clone https://github.com/dlpwaters/creator-studio.git
   cd creator-studio
   ```

2. Create local secrets. This command refuses to overwrite an existing `.env`:

   ```sh
   umask 077
   test ! -e .env && {
     printf 'OPEN_NOTEBOOK_ENCRYPTION_KEY=%s\n' "$(openssl rand -hex 32)"
     printf 'SURREAL_USER=creator\n'
     printf 'SURREAL_PASSWORD=%s\n' "$(openssl rand -hex 32)"
   } > .env
   ```

   Keep `.env` private and back it up securely. Preserve the encryption key when
   upgrading or restoring data; changing it makes existing encrypted credentials
   unreadable. If `.env` already exists, review its required settings rather than
   rerunning this command.

3. Build Creator Studio from this checkout:

   ```sh
   docker build -t creator-studio:local .
   ```

4. Start the application and database:

   ```sh
   docker compose --env-file .env -p creator-studio \
     -f examples/docker-compose-creator-studio.yml up -d
   ```

5. Check startup, then open **http://localhost:8502**:

   ```sh
   docker compose --env-file .env -p creator-studio \
     -f examples/docker-compose-creator-studio.yml ps
   curl --fail http://localhost:5055/health
   ```

   Allow startup and database migrations to finish if the API is not yet ready.
   The API reference is at **http://localhost:5055/docs**. The Compose example
   binds the UI and API to localhost and keeps the database on its private
   container network. It requires explicit secrets and uses the locally built
   application image. Upstream `lfnovo/open_notebook` images do not include this
   fork's Creation Studio changes.

### Configure models when you need AI

Open **Models & API keys**. Add a provider credential, test the connection,
discover and register models, then assign defaults for chat, transformations,
and embeddings. Studio AI drafts use a selected language model or the existing
transformation/chat default. You can start with source excerpts from a note or
an already extracted source without a model call.

Credentials are stored encrypted on the server. Provider requests may send
selected research to that provider and incur charges. Use a suitable local model
when you need local AI processing. OpenAI access uses supported server-side API
credentials; consumer ChatGPT OAuth sign-in is not implemented. See
[provider setup](docs/CREATION_STUDIO.md#provider-setup) and
[AI provider documentation](docs/4-AI-PROVIDERS/index.md).

### Make your first draft

1. Create a notebook and add a source or a note.
2. Wait for source extraction and resolve any readiness errors.
3. Choose **Create from notebook**, select a format, and select evidence.
4. Enter the subject and choose **Source excerpts** or **AI draft**.
5. Review claims and references, edit the sections, and save.
6. Export, present, or study the result.

## Configuration, storage, and upgrades

| Setting | Purpose |
| --- | --- |
| `OPEN_NOTEBOOK_ENCRYPTION_KEY` | Required to encrypt stored provider credentials; preserve it across upgrades |
| `SURREAL_USER`, `SURREAL_PASSWORD` | Database credentials shared by the two services in the fresh-install example |
| `OPEN_NOTEBOOK_PASSWORD` | Optional installation password; set before allowing access beyond localhost |
| `CORS_ORIGINS` | Browser origins allowed to call the API; the example restricts them to the local UI |
| `API_URL` | Public API address when using a custom domain or reverse proxy |
| `CREATOR_STUDIO_IMAGE` | Optional application image override in the Compose example; defaults to `creator-studio:local` |

The example persists research in the `surreal_data` volume and application files
in `notebook_data`. Studio artifacts live under `/app/data/studio` in that second
volume. Back up **both volumes and the encryption key** before upgrading.
`docker compose down` preserves named volumes; adding `--volumes` deletes them.

For a fresh installation created with this example, rebuild after updating the
checkout and rerun the same `up -d` command. Keep the previous image under a
separate tag for rollback. Existing installations with a newer backend should use
the [additive overlay](docs/CREATION_STUDIO.md#upgrade-an-existing-installation-safely)
to preserve their installed dependencies and migration version.

The password applies to the entire installation. Creator Studio does not add
separate user accounts or per-user isolation. For remote access, configure HTTPS,
authentication, explicit origins, and appropriate network restrictions before
exposing the services. See [security configuration](docs/5-CONFIGURATION/security.md).

## Development and verification

Use Python **3.11 or 3.12**, Node.js **22**, uv, and Docker for development.
Install dependencies from the lockfiles:

```sh
uv sync --frozen
npm --prefix frontend ci
```

Run the API, source-processing worker, and frontend as described in the
[source installation guide](docs/1-INSTALLATION/from-source.md). The worker is
required for background ingestion and embeddings. Native MP4/narration exports
also need ffmpeg, DejaVu fonts, and espeak-ng; the Docker image includes them.

Run the checks used for this project:

```sh
uv run pytest tests/ -v
uv run ruff check .
npm --prefix frontend test
npm --prefix frontend run lint
(cd frontend && npx tsc --noEmit)
npm --prefix frontend run build
```

The merged Studio milestone passed **330 backend tests and 206 frontend tests**,
TypeScript, and the production image build. Browser checks covered desktop and
390-pixel phone layouts, light/dark themes, editing and recovery, and actual
exports. Automated accessibility checks passed on the inspected screens. These
checks do not establish every user's accessibility or content-review needs.
See [project status](docs/STATUS.md) for verification details and deployment state.

## Limits to understand

- AI drafts require source review. A saved reference records provenance; it does
  not prove that a claim is correct or supported.
- Source excerpts preserve input text. They do not translate, infer dates, or
  establish conceptual relationships.
- Studio currently uses English fallback copy in other UI locales. Local voice
  and font coverage vary by language; review exported text and pronunciation.
- JSON import must be smaller than 1 MB. An installation supports up to 1,000
  saved artifacts. See [storage and limits](docs/CREATION_STUDIO.md#storage-and-limits).
- Model and renderer availability determine which features can run. Missing
  export tools disable the corresponding formats.

## Documentation and support

| Need | Start here |
| --- | --- |
| Drafts, exports, transfer, and recovery | [Creation Studio guide](docs/CREATION_STUDIO.md) |
| Verified state and remaining acceptance | [Project status](docs/STATUS.md) |
| Sources, notes, chat, and search | [User guide](docs/3-USER-GUIDE/index.md) |
| AI provider configuration | [Providers](docs/4-AI-PROVIDERS/index.md) |
| API integrations | [API reference](docs/7-DEVELOPMENT/api-reference.md) |
| Installation problems | [Troubleshooting](docs/6-TROUBLESHOOTING/quick-fixes.md) |
| Architecture and contributions | [Development documentation](docs/7-DEVELOPMENT/index.md) |

Report Creator Studio bugs and feature requests in
[this repository's issues](https://github.com/dlpwaters/creator-studio/issues).
Include the commit or image version, reproduction steps, and relevant redacted
logs. Keep credentials, private source material, and database dumps out of issues.
For contributions, see [CONTRIBUTING.md](CONTRIBUTING.md); use Creator Studio's
repository for issues and pull requests. Existing upstream guides may still use
Open Notebook terminology or upstream image examples. Use the setup above for
this fork's complete feature set.

## Attribution and license

Creator Studio is a fork of [Open Notebook](https://github.com/lfnovo/open-notebook),
created by Luis Novo and its contributors. The original research, provider,
podcast, and notebook infrastructure comes from that project. The
[Open Notebook website](https://www.open-notebook.ai) and
[Discord community](https://discord.gg/37XJPXfz2w) belong to the upstream project.

Distributed under the [MIT License](LICENSE). The upstream copyright and license
notices are preserved.
