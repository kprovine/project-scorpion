# Project Scorpion Plan

This is the living plan for Project Scorpion. It replaces the dated roadmap documents as the source of truth for what we are building next.

## Product goal

Build a personal intelligence dashboard that is useful enough to become the browser homepage you choose to open every day.

## Working principles

- Improve usefulness before adding complexity.
- Finish and verify one step at a time.
- Preserve working behavior unless a change requires otherwise.
- Prefer small improvements to large rewrites.
- Keep RSS sources centralized in `public/sources.js`.
- Do not commit, push, or deploy changes until they have been reviewed.

## Phase 0 — Project foundation

Goal: make the existing project understandable, consistent, and safe to change.

- [x] Step 1 — Inspect and document the current project.
- [x] Step 2 — Fix formatting and corrupted text.
- [x] Step 3 — Add basic project housekeeping.
- [x] Step 4 — Improve the README.
- [x] Step 5 — Establish a safe change process.
- [x] Step 6 — Verify the baseline.

## Phase 1 — Reliable feeds

Goal: make the current dashboard load and refresh stories dependably.

- [x] Repair the live refresh system.
- [x] Verify every configured RSS source.
- [x] Store readable source names and real publication times.
- [x] Preserve useful content when an individual source fails.
- [x] Verify loading, refreshing, failure handling, and mobile behavior.

## Phase 2 — Feed quality

Goal: make Top Stories genuinely useful instead of mechanically ranked.

- [x] Replace random score variation with deterministic scoring.
- [x] Add recency weighting.
- [x] Add source-quality weighting.
- [ ] Improve headline deduplication.
- [ ] Improve HOT story detection.

## Phase 3 — More useful cards

Goal: expand the dashboard with information worth checking daily.

Possible cards include AI, technology, world news, weather, Reddit, GitHub, calendar, and personal notes. Specific cards will be chosen based on daily usefulness.

## Phase 4 — Customization

Goal: let users shape the dashboard without editing code.

- [ ] Add and remove cards.
- [ ] Choose sources for each card.
- [ ] Rearrange cards.
- [ ] Save layout preferences.

## Phase 5 — Personal homepage integrations

Goal: combine public information with personal tools after the core dashboard proves useful.

Potential integrations include calendar, GitHub, Reddit, notes, and notifications.

## Current focus

Begin Phase 1 with the reliable feed work.
