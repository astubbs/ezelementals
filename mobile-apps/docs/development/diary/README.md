# Development Diary

A chronological, append-only log of how this project was built: the
decisions we made, the reasoning behind them, the things we tried,
the things we ripped up, and the things still open.

The diary exists because six months from now, somebody (probably us)
will be reading the code and thinking "why on earth is it done like
*that*?" — and the answer is rarely in a commit message.

## When to write an entry

Per [`mobile-apps/AGENTS.md`](../../../AGENTS.md), entries get written for:

- **Milestone scoping.** Whenever a new milestone is defined or its
  scope materially changes.
- **Project plans.** Major product plan changes, scope pivots,
  backend additions or removals.
- **Interesting discoveries.** Non-obvious technical findings,
  protocol quirks, library bugs, UX insights that future-us would
  want to know the *why* for.

The diary is *not* for routine progress updates. If a commit message
covers it, a diary entry is probably overkill.

## Format

- One file per entry.
- Filename: `YYYY-MM-DD-slug.md`. If multiple entries land on the
  same day, append `-a`, `-b`, etc.
- Entries are backward-looking records, not forward-looking plans.
  Write them *after* the decision is made, covering what was decided,
  *why*, what alternatives were considered, and what's still open.
- Lead with a short summary so someone skimming the index can tell
  whether this entry is the one they're looking for.
- Plain Markdown. No emoji.

## Index

- [`2026-04-11-m1-scope.md`](2026-04-11-m1-scope.md) — M1 scope
  settled: volume control + first-launch onboarding wizard with
  Denon direct and Home Assistant discovery.
- [`2026-04-11-b-m1-scaffold.md`](2026-04-11-b-m1-scaffold.md) —
  M1 scaffold: both native apps laid down end-to-end following the
  shared specs, plus CI workflows and first unit tests.
- [`2026-04-11-c-visual-smoke-tests.md`](2026-04-11-c-visual-smoke-tests.md) —
  Closing the smoke-test gap on iOS: pixel-variance helper,
  ImageRenderer-based unit snapshot tests, and XCUITest screenshot
  assertions. Why accessibility-tree queries weren't catching
  blank-screen rendering bugs.
