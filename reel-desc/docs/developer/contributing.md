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
bin/test.sh    # Python test suite
uv run pytest  # Direct pytest invocation

cd ui
npm test           # Frontend unit tests (Vitest, watch mode)
npm run test:run   # Frontend unit tests (single run)
npm run e2e:install  # One-time: install Chromium for Playwright
npm run e2e        # Frontend E2E tests (Playwright, real FastAPI backend)
```

Three test layers:
- **Python tests** — pytest on 3.11 and 3.12 in CI. Covers pipeline stages with mocked Ollama/ffmpeg.
- **Frontend unit tests** — Vitest + React Testing Library + jsdom. Components and pages with API calls mocked at module level. Mock data in `ui/src/test/mocks/api.ts`.
- **E2E tests** — Playwright in `ui/e2e/`. Launches `bin/ui.sh` (builds frontend + starts FastAPI on :8765) and drives a real browser against the live stack. No API mocking.

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

## Stacked PRs

When a PR depends on another PR being merged first (stack-style workflow), declare it in the PR body:

```
depends on #123
```

or

```
blocked by #123
```

The `PR Dependency Check` workflow fails the check status until the declared parent is closed/merged. When the parent merges, the check automatically re-runs on dependent PRs and unblocks them — no manual action needed.

Use `#N` format. Cross-repo refs (`owner/repo#N`) also work.

## CI overview

Main workflow: `.github/workflows/reel-desc-ci.yml`. Runs on push to `main`/`develop`/`spike` and on PRs.

Core jobs (run on both push and PR):
- `python-tests` — matrix on Python 3.11/3.12, ruff lint + pytest
- `frontend-lint` — ESLint + `tsc -b` typecheck
- `frontend-unit` — Vitest
- `frontend-e2e` — Playwright against real FastAPI (via `bin/ui.sh`); uploads report on failure

PR-only quality gates:
- `duplicate-detection` — line-level clone detection (PMD CPD + jscpd)
- `file-similarity` — whole-file similarity, base-vs-PR comparison
- `dependency-scan` — CVE check on newly-added npm/pip deps

Separate workflow: `.github/workflows/reel-desc-pr-dependencies.yml` — the `PR Dependency Check` described above.
