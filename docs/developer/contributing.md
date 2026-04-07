# Contributing

## Development setup

```sh
git clone https://github.com/astubbs/ezElementals.git
cd ezElementals
uv sync
```

### Frontend development

```sh
cd ui
npm install
npm run dev    # Vite dev server with hot reload (proxies API to FastAPI)
```

### Running tests

```sh
bin/test.sh    # Full test suite
uv run pytest  # Direct pytest invocation
```

Tests run on Python 3.11 and 3.12 in CI.

## Project structure

See [Architecture](architecture.md) for the full package layout.

## Testing conventions

- Tests live in `tests/integration/`
- Ollama calls are mocked via `pytest-httpx`
- ffmpeg calls are mocked at the subprocess level
- Use fixtures from `tests/fixtures/` for canned responses and sample frames
- Every pipeline stage must handle failures gracefully (flag, don't crash)

## Code style

- Python code is linted with ruff
- Follow existing patterns in the codebase
- No premature abstractions — three similar lines is better than a helper nobody will reuse

## Documentation

All changes must update the relevant docs in the same commit. See [AGENTS.md](../../AGENTS.md) for the full documentation sync rules.

Docs cover three audiences:
- `docs/user/` — end-user guides
- `docs/developer/` — format specs, architecture, contributing
- `docs/internal/` — planning, milestones, naming decisions
