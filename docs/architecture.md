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

- Hash routing (`src/ui/routes.ts`, `use-route.ts`): `#/`, `#/league`, `#/club/:clubId`, `#/match`, `#/results`, `#/season-end`, `#/saves`; unknown hashes show a not-found view. No server support needed.
- The club screen (`club-screen.tsx`, `squad-rows.ts`) is read-only: form chips, next three fixtures, season history, the seven derived phase ratings (0-100) and the squad grouped by position and sortable per group. The best-eleven marking comes from `pickBestEleven`; attribute bands are low 1-7, mid 8-13, high 14-20, always with the number shown. An unknown club id shows the not-found view.
- The career lives in `useCareer` (`use-career.tsx`), an in-memory store. M4 plugs the `SaveStore` in there without changing screens. Without a career every route except `#/match` shows the new-career screen.
- `#/league` (`league-screen.tsx`) has a Table tab (`league-table.tsx`, built from `computeTable`) and a Fixtures tab (`fixtures-view.tsx`). `LeagueView` takes the career as a prop; `LeagueScreen` reads it from `useCareer`, so new results show without a reload.
- Season flow: the hub shows the next match with "Play match" (`#/match`, `MatchFlowScreen` feeding `MatchScreen` from `matchSetupFor`) and "Quick sim" (`simulateFixture`). Both record the result through `useCareer().completeMatch` (`completeMatchday`) and lead to `#/results`, which lists the round and the user's table position. After the last matchday `#/season-end` shows the `summariseSeason` summary and "Start next season". Guards: `#/match`, `#/results` and `#/season-end` redirect to the hub when there is nothing to show. Leaving a match mid-way records nothing and the next visit restarts from kickoff.
- `App` takes `saveStore`, `fileTransfer`, `now` (ISO clock) and optional `storageAvailable` next to `localeStore`. `main.tsx` passes the IndexedDB store, or the memory store with `storageAvailable={false}` (which shows `StorageWarning`). `CareerProvider` autosaves through the `SaveStore` and exposes `saveStatus`, `lastSavedAt`, `continueAvailable`, `continueInfo`, `loadAutosave()`, `loadError` and `dismissLoadError()`; the header shows `SaveStatus` and the new-career screen shows `ContinuePanel` (Continue button or load error).
- The saves screen (`saves-screen.tsx`, `save-slots.ts`) at `#/saves` lists the `autosave` slot and manual slots `slot-1` to `slot-3` and works without a career (only loading is enabled then). Rows are built with `readSlot` (`readEnvelope` + `parseCareer`); a damaged slot shows "Corrupt save" with only Delete and never breaks the screen. `useCareer` exposes `listSlots()`, `saveToSlot(id)`, `loadSlot(id)` and `deleteSlot(id)`, which return `{ ok } | { ok: false, error }` and never throw. Manual saves get a fresh envelope (`createdAt` and `savedAt` = time of the write); rows show `savedAt`; the autosave slot cannot be written manually. Overwriting a used slot and deleting ask for confirmation; loading replaces the running career without asking and leads to the hub.
- Export and import (`import-save.ts`, `import-controls.tsx`): `App` and `CareerProvider` take a `fileTransfer`; `main.tsx` passes `createBrowserFileTransfer()`. Filled slot rows have "Export" (the stored, migrated envelope via `serializeSave`, named by `saveFileName`) and the saves screen has "Export running career" while a career exists. "Import file" (saves screen and new-career screen) runs `pickFile`, `parseSaveFile` and `parseCareer`; a valid file becomes `importOffer` and the saves screen asks for a manual slot (`import-into-<id>`), confirming before overwriting a used slot, then stores the envelope with its original `createdAt` and highlights the slot (`data-highlighted`). It never replaces the running career. Failures set `importError` (`not-json`, `not-a-save`, `newer-version`, `file-too-large`, `corrupt-career`), shown as `import-error`; cancelling the picker is silent. On the new-career screen a valid pick navigates to `#/saves`.
- The composition root passes `initialSeed` to `App`, so the UI itself never draws randomness and tests stay deterministic.

## Commentary

- `generateCommentary(events, context, seed)` in `src/commentary` turns the event log into feed lines. It is pure and uses its own RNG stream (`createRng(seed).fork("commentary")`), so it never changes the simulation.
- Templates live per locale in `src/commentary/templates` (several variants per event type; a test enforces `en` and `sv` have the same keys). Grammar helpers such as the Swedish genitive are in `grammar.ts`.
- Player names appear only on goals. The scorer of each goal comes from `attributeGoalScorers(events, squads, seed)` in `src/game` (weighted by position and finishing, own RNG stream, no engine draws) and is passed in as `CommentaryContext.scorers`. Every 15 minutes there is a possession summary; half-time and full-time lines carry the score.

## Persistence

- `SaveStore` interface: `list()`, `load(id)`, `save(id, data)`, `delete(id)`.
- `createIndexedDbSaveStore(factory?, dbName?)` (`src/platform/save/indexeddb-save-store.ts`) is the browser implementation: database `touchline` version 1 with one object store `saves` keyed by save id. Every call opens, uses and closes its own connection; open, read and write failures (including blocked opens and aborted transactions) reject with a clear `Error`. `isIndexedDbAvailable()` tells the app when to fall back to the in-memory store. The `indexedDB` global is read only inside these functions, never at import time. It runs the shared `runSaveStoreContract` suite against `fake-indexeddb` (dev dependency).
- Save format: `{ schemaVersion, createdAt, savedAt, game }` (`createdAt` is when the career was first saved and survives re-saves; `savedAt` is the time of the last write), with a migration per version bump.
- Codec (`src/platform/save`): `createEnvelope(game, now)` and `updateEnvelope(previous, game, now)` build envelopes (the clock is injected; re-saving keeps `createdAt` and sets a new `savedAt`), `readEnvelope(raw)` migrates an untrusted blob to `CURRENT_SCHEMA_VERSION`, rejects one without a valid `savedAt` (`invalid-envelope`) and returns `{ ok, save } | { ok: false, error }`. The codec is game-agnostic (`game: unknown`); the caller runs `parseCareer` afterwards.
- Versioning rule: `schemaVersion` 1 is the M3 `Career` shape; version 2 adds `savedAt` to the envelope (migration: `savedAt = createdAt`). Every change to `Career` or the envelope bumps `CURRENT_SCHEMA_VERSION` in `schema.ts` and adds a `Migration` to `MIGRATIONS`; a test fails if the list is not a gapless chain from 1.
- Fixture policy: `fixtures/career-v1.json` and `fixtures/career-v2.json` are real saves, frozen and never regenerated. A bump adds `career-v3.json` and keeps the older fixtures, so old saves keep loading.
- Saved and imported data is untrusted: `parseCareer(raw)` in `src/game` rebuilds a `Career` field by field and returns `{ ok, career } | { ok: false, error }` (never throws, never returns the input). Every stored `game` payload goes through it before the UI uses it.
- Save files (`src/platform/save/save-file.ts`): `serializeSave(envelope)` writes pretty-printed JSON; `parseSaveFile(text)` rejects files above 10 MB (`file-too-large`), non-JSON (`not-json`) and otherwise delegates to `readEnvelope`, so it adds no version logic of its own (`invalid-envelope`, `newer-version`, `missing-migration`). `saveFileName({ clubName, season, matchday })` gives `touchline-<club-slug>-s<season>-md<matchday>.json` with Swedish letters folded to ASCII and a safe fallback slug.
- `FileTransfer` (`src/shared`): `download(name, text)` and `pickFile()`. `createBrowserFileTransfer()` uses Blob + object URL (revoked after the click) and a hidden file input; `createMemoryFileTransfer()` records downloads and returns queued files for tests. A Tauri adapter can replace the browser one.
- Autosave (`src/ui/autosave-queue.ts`): slot `autosave`, written after the career is created, after every completed matchday and after starting the next season, never mid-match. `createAutosaveQueue(store, now)` runs writes strictly one after another so the last state wins; `save(game, "new" | "continue")` starts a new `createdAt` or keeps the current one (`adopt` marks a loaded envelope as the one to continue). A failed write rejects only its own promise and never blocks play.
- Startup (`src/ui/find-continue-candidate.ts`): `findContinueCandidate(store)` reads the autosave (or the newest valid save by `savedAt` when there is none) through `readEnvelope` and `parseCareer`. A damaged or newer-version autosave is returned as an error and never falls back to another slot. Nothing is loaded until the user presses Continue.
- E2E (`e2e/persistence.spec.ts`): reload and continue (tagged `@smoke`), manual slot save and load, export a slot and import the downloaded file into another slot, and rejecting a garbage file. Each test runs in a fresh browser context, so IndexedDB starts empty.

## Desktop later (Tauri)

The Vite build runs unchanged in Tauri. Adding a Tauri file-system `SaveStore` and a release workflow (tauri-action) should be the only work needed. Keep all browser-specific code in `platform` to protect this.
