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
- The match screen (`src/ui/match-view/match-screen.tsx`) composes the terrain with a scoreboard, momentum chart (`momentumSeries`), stats panel (`computeMatchStats`), commentary feed and speed controls. `useMatchPlayback` advances the engine from the wall clock and stops at half-time and full time.
- `reference/match-view-prototype.html` is the visual reference (prototype quality, not production code). Its tuning values are a starting point.

## App shell

- Hash routing (`src/ui/routes.ts`, `use-route.ts`): `#/`, `#/league`, `#/club/:clubId`, `#/match`, `#/results`, `#/season-end`; unknown hashes show a not-found view. No server support needed.
- The club screen (`club-screen.tsx`, `squad-rows.ts`) is read-only: form chips, next three fixtures, season history, the seven derived phase ratings (0-100) and the squad grouped by position and sortable per group. The best-eleven marking comes from `pickBestEleven`; attribute bands are low 1-7, mid 8-13, high 14-20, always with the number shown. An unknown club id shows the not-found view.
- The career lives in `useCareer` (`use-career.tsx`), an in-memory store. M4 plugs the `SaveStore` in there without changing screens. Without a career every route except `#/match` shows the new-career screen.
- `#/league` (`league-screen.tsx`) has a Table tab (`league-table.tsx`, built from `computeTable`) and a Fixtures tab (`fixtures-view.tsx`). `LeagueView` takes the career as a prop; `LeagueScreen` reads it from `useCareer`, so new results show without a reload.
- Season flow: the hub shows the next match with "Play match" (`#/match`, `MatchFlowScreen` feeding `MatchScreen` from `matchSetupFor`) and "Quick sim" (`simulateFixture`). Both record the result through `useCareer().completeMatch` (`completeMatchday`) and lead to `#/results`, which lists the round and the user's table position. After the last matchday `#/season-end` shows the `summariseSeason` summary and "Start next season". Guards: `#/match`, `#/results` and `#/season-end` redirect to the hub when there is nothing to show. Leaving a match mid-way records nothing and the next visit restarts from kickoff.
- The composition root passes `initialSeed` to `App`, so the UI itself never draws randomness and tests stay deterministic.

## Commentary

- `generateCommentary(events, context, seed)` in `src/commentary` turns the event log into feed lines. It is pure and uses its own RNG stream (`createRng(seed).fork("commentary")`), so it never changes the simulation.
- Templates live per locale in `src/commentary/templates` (several variants per event type; a test enforces `en` and `sv` have the same keys). Grammar helpers such as the Swedish genitive are in `grammar.ts`.
- Player names appear only on goals. The scorer of each goal comes from `attributeGoalScorers(events, squads, seed)` in `src/game` (weighted by position and finishing, own RNG stream, no engine draws) and is passed in as `CommentaryContext.scorers`. Every 15 minutes there is a possession summary; half-time and full-time lines carry the score.

## Persistence

- `SaveStore` interface: `list()`, `load(id)`, `save(id, data)`, `delete(id)`.
- `createIndexedDbSaveStore(factory?, dbName?)` (`src/platform/save/indexeddb-save-store.ts`) is the browser implementation: database `touchline` version 1 with one object store `saves` keyed by save id. Every call opens, uses and closes its own connection; open, read and write failures (including blocked opens and aborted transactions) reject with a clear `Error`. `isIndexedDbAvailable()` tells the app when to fall back to the in-memory store. The `indexedDB` global is read only inside these functions, never at import time. It runs the shared `runSaveStoreContract` suite against `fake-indexeddb` (dev dependency).
- Save format: `{ schemaVersion, createdAt, game }`, with a migration per version bump.
- Codec (`src/platform/save`): `createEnvelope(game, now)` and `updateEnvelope(previous, game)` build envelopes (the clock is injected; re-saving keeps `createdAt`), `readEnvelope(raw)` migrates an untrusted blob to `CURRENT_SCHEMA_VERSION` and returns `{ ok, save } | { ok: false, error }`. The codec is game-agnostic (`game: unknown`); the caller runs `parseCareer` afterwards.
- Versioning rule: `schemaVersion` 1 is the M3 `Career` shape. Every change to `Career` bumps `CURRENT_SCHEMA_VERSION` in `schema.ts` and adds a `Migration` to `MIGRATIONS`; a test fails if the list is not a gapless chain from 1.
- Fixture policy: `fixtures/career-v1.json` is a real v1 save, frozen and never regenerated. A bump adds `career-v2.json` and keeps the older fixtures, so old saves keep loading.
- Saved and imported data is untrusted: `parseCareer(raw)` in `src/game` rebuilds a `Career` field by field and returns `{ ok, career } | { ok: false, error }` (never throws, never returns the input). Every stored `game` payload goes through it before the UI uses it.
- Autosave after each match day; manual export/import as a JSON file.

## Desktop later (Tauri)

The Vite build runs unchanged in Tauri. Adding a Tauri file-system `SaveStore` and a release workflow (tauri-action) should be the only work needed. Keep all browser-specific code in `platform` to protect this.
