# Creator Studio from source

Clone Creator Studio and run the API, worker, and frontend locally.
**For developers and contributors.** For a new Docker installation, use the
[README recipe](../../README.md#get-started), which includes export prerequisites.

## Prerequisites

- **Python 3.11 or 3.12** - [Download](https://www.python.org/)
- **Node.js 22** - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **Docker** (for SurrealDB) - [Download](https://docker.com/)
- **uv** (Python package manager) - `curl -LsSf https://astral.sh/uv/install.sh | sh`
- A configured model for AI features; source-excerpt Studio drafts make no model call
- ffmpeg, DejaVu fonts, and espeak-ng for local video/narration exports

## Setup

### 1. Clone Repository

```bash
git clone https://github.com/dlpwaters/creator-studio.git
cd creator-studio

# Optional: track the original project separately
git remote add upstream https://github.com/lfnovo/open-notebook.git
```

### 2. Install Python Dependencies

```bash
uv sync --frozen
```

#### 2.1 Alternative: Conda Setup (Optional)

If you prefer using **Conda** to manage your environments, follow these steps instead of the standard `uv sync`:

```bash
# Create and activate the environment
conda create -n open-notebook python=3.11 -y
conda activate open-notebook

# Install uv inside conda to maintain compatibility with the Makefile
conda install -c conda-forge uv nodejs -y

# Sync dependencies
uv sync --frozen
```

> **Note**: Installing `uv` inside your Conda environment ensures that commands like `make start-all` and `make api` continue to work seamlessly.

### 3. Start SurrealDB

The root Compose file is inherited from upstream. `make database` starts only its
database service, with development credentials and host port 8000. Keep that
database on localhost: change its port mapping to `127.0.0.1:8000:8000` before
starting it on a shared machine. Preserve database credentials when working with
an established installation.

```bash
# Terminal 1
make database
# or: docker compose up surrealdb
```

### 4. Set Environment Variables

```bash
test -e .env || (umask 077; cp .env.example .env)
# Edit .env and set a strong OPEN_NOTEBOOK_ENCRYPTION_KEY.
# For the host API, use SURREAL_URL=ws://127.0.0.1:8000/rpc.
# Match SURREAL_USER and SURREAL_PASSWORD to your database.
# Restrict CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000.
```

After starting the app, configure AI providers via the **Manage → Models** UI in the browser.

Configure `.env` for a host connection, not the `surrealdb` container hostname
used inside Docker. Preserve existing encryption keys when working with an
established installation. Set `OPEN_NOTEBOOK_PASSWORD` if password protection
is needed; the API and frontend use the same installation password.

### 5. Start API

```bash
# Terminal 2
make api
# or: uv run --env-file .env uvicorn api.main:app --host 0.0.0.0 --port 5055
```

### 6. Start Worker

Source and note processing (content extraction, embedding, insights) is dispatched
as background jobs that a **separate worker** process consumes. Without it, every
source stays stuck at `Source processing status: CommandStatus.NEW` forever.

```bash
# Terminal 3
make worker
# or: uv run --env-file .env surreal-commands-worker --import-modules commands
```

> `make start-all` starts Database + API + Worker + Frontend together; the steps
> above run them individually so you can see each process's logs.

### 7. Start Frontend

```bash
# Terminal 4
cd frontend && npm ci && npm run dev
```

### 8. Access

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:5055/docs
- **Database**: http://localhost:8000

### 9. Configure AI Provider

1. Open http://localhost:3000
2. Go to **Manage** → **Models**
3. Click **Add Credential** → Select your provider → Paste API key
4. Click **Save**, then **Test Connection**
5. Click **Discover Models** → **Register Models**

---

## Development Workflow

### Code Quality

```bash
# Format and lint Python
make ruff
# or: ruff check . --fix

# Type checking
make lint
# or: uv run python -m mypy .
```

### Run Tests

```bash
uv run pytest tests/
```

### Common Commands

```bash
# Start everything
make start-all

# View API docs
open http://localhost:5055/docs

# Check database migrations
# (Auto-run on API startup)

# Stop foreground development processes with Ctrl+C in their terminals.
# Stop the database without deleting its data:
docker compose stop surrealdb
```

---

## Troubleshooting

### Python version too old

```bash
python --version  # Check version
uv sync --python 3.11  # Use specific version
```

### npm: command not found

Install Node.js from https://nodejs.org/

### Database connection errors

```bash
docker ps  # Check SurrealDB running
docker logs surrealdb  # View logs
```

### Port 5055 already in use

```bash
# Use different port
uv run uvicorn api.main:app --port 5056
```

---

## Next Steps

1. Read [Development Guide](../7-DEVELOPMENT/quick-start.md)
2. See [Architecture Overview](../7-DEVELOPMENT/architecture.md)
3. Check [Contributing Guide](../7-DEVELOPMENT/contributing.md)

---

## Getting Help

- **Discord**: [Community](https://discord.gg/37XJPXfz2w)
- **Creator Studio issues**: [GitHub Issues](https://github.com/dlpwaters/creator-studio/issues)
- **Studio workflow and limits**: [Creation Studio](../CREATION_STUDIO.md)
