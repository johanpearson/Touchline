# Architecture

## Module layout

```
src/
  shared/        small shared types and utilities (no dependencies)
  engine/        match simulation: seeded RNG, zone model, events, stats (pure)
  game/          career domain: clubs, players, leagues, fixtures, seasons, transfers (pure)
  commentary/    match commentary templates per locale and grammar helpers
  i18n/          locales (en, sv), typed keys, formatting
  platform/      adapters: SaveStore (memory, IndexedDB, later Tauri), file export/import
  ui/            React app shell, screens, components
  ui/match-view/ three.js momentum terrain, momentum chart, feed, stats panel
  main.tsx       composition root: wires platform adapters into the app
e2e/             Playwright tests
```

Allowed dependencies (enforced by dependency-cruiser):

```
engine     -> shared
game       -> engine, shared
commentary -> engine, i18n, shared
platform   -> shared, game (types only)
ui         -> game, engine (public index only), commentary, i18n, platform, shared
```

## Match engine

- `createMatch(input, seed)` returns a match simulation with `advanceTo(time)`, `applyChange(change)` (substitutions, tactics) and the accumulated `events`.
- A match is fully reproducible from `seed + input + list of timed changes`. Saves store this, not the whole event log.
- State: possession, ball zone (x, y in 0..1), danger level, score, period.
- Each step resolves one transition (progress, lateral move, turnover, foul, shot, corner) with probabilities from team phase ratings: build-up, progression, chance creation, finishing, pressing, defending, goalkeeping.
- Tactics modify those probabilities (for example high press: more turnovers high up, more exposure to counters).
- Output is an ordered `MatchEvent[]` with time, team, position, type and intensity.
- Stats (possession, field tilt, shots, on target, xG, corners) are pure functions over the event log.
- Periods: first half, half-time (simulation paused until the user resumes), second half, added time. Kickoff after goals and at the start of each half.

## Match view

- Consumes the event log only. It never calls engine internals.
- Height field on a grid over the pitch: each event adds a Gaussian bump that decays over time. The ball holder leaves a continuous pulse.
- Colour per vertex: blend of both teams' pressure plus a moving front (territory) between the halves.
- Goals: tall spike, shockwave ring in the scorer's colour, short pause, then reset to kickoff.
- Half-time: the pitch resets; the user starts the second half after changes.
- `reference/match-view-prototype.html` is the visual reference (prototype quality, not production code). Its tuning values are a starting point.

## Commentary

- `generateCommentary(events, context, seed)` in `src/commentary` turns the event log into feed lines. It is pure and uses its own RNG stream (`createRng(seed).fork("commentary")`), so it never changes the simulation.
- Templates live per locale in `src/commentary/templates` (several variants per event type; a test enforces `en` and `sv` have the same keys). Grammar helpers such as the Swedish genitive are in `grammar.ts`.
- Player names appear only on goals. Every 15 minutes there is a possession summary; half-time and full-time lines carry the score.

## Persistence

- `SaveStore` interface: `list()`, `load(id)`, `save(id, data)`, `delete(id)`.
- Save format: `{ schemaVersion, createdAt, game }`, with a migration per version bump.
- Autosave after each match day; manual export/import as a JSON file.

## Desktop later (Tauri)

The Vite build runs unchanged in Tauri. Adding a Tauri file-system `SaveStore` and a release workflow (tauri-action) should be the only work needed. Keep all browser-specific code in `platform` to protect this.
