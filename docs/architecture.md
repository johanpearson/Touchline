# Architecture

## Module layout

```
src/
  shared/        small shared types and utilities (no dependencies)
  engine/        match simulation: seeded RNG, zone model (v1), action model (v2, M5b), events, stats (pure)
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
- `applyChange({ side, profile?, tactics? })` swaps one side's `TeamMatchProfile` and/or `TeamTactics` from the current match time. The engine knows no players: a substitution reaches it as a new profile computed in `game`. It is only accepted between steps (always true between `advanceTo` calls), is not limited to half-time, is ignored after full time, and consumes no randomness. Applied changes are listed in `Match.changes` as `{ time, change }`, in order, separate from `events` so terrain, stats and commentary need no new event type. Reproducibility rule: the same `seed + input + changes` replayed at the same moments gives the same event log, however time is split across `advanceTo` calls; a change that sets the input's own values gives exactly the unchanged match. Step delays already scheduled keep the old tactics; the new ones apply from the next scheduled step (and from the kickoff after `resume`).
- Half-time flow: the engine pauses at half-time; `game`'s `planHalfTime` (see Game state) turns the user's substitutions and tactics into one `MatchChange`, the UI applies it with `applyChange` and calls `resume`.
- State: possession, ball zone (x, y in 0..1), danger level, score, period.
- Each step resolves one transition (progress, lateral move, turnover, foul, shot, corner) with probabilities from team phase ratings: build-up, progression, chance creation, finishing, pressing, defending, goalkeeping.
- Tactics modify those probabilities (for example high press: more turnovers high up, more exposure to counters).
- Output is an ordered `MatchEvent[]` with time, team, position, type and intensity.
- Stats (possession, field tilt, shots, on target, xG, corners) are pure functions over the event log.
- Tactics (`src/engine/tactics.ts`): `TeamTactics` has four settings, each with a neutral middle level (`NEUTRAL_TACTICS`: balanced, medium, normal, normal). Neutral tactics add 0 (or multiply by 1) everywhere, draw no extra randomness and give exactly the event log of the engine without tactics (pinned by `neutral-regression.test.ts` against `fixtures/neutral-event-logs.json`, which is never regenerated). `tacticsModifiers(tactics)` sums the effects of the four settings; `transition.ts` and `create-match.ts` apply them. Constants (additive unless noted; "conceded" applies while the opponent has the ball):
  - Mentality: attacking = shoot chance +0.03, conceded shoot chance +0.05; defensive = shoot -0.03, conceded -0.04.
  - Pressing: high = opponent advance chance -0.06 but opponent advance step +0.035 and conceded shoot chance +0.03 (space behind the press); low = opponent advance chance +0.02, opponent advance step -0.01.
  - Width: wide = lateral chance +0.03, corner chance +0.08, shot quality x0.85; narrow = lateral -0.02, corner -0.06, shot quality x1.08.
  - Tempo: fast = step delay x0.8, advance chance -0.01 (more turnovers); slow = step delay x1.2.
  - `engine.balance.test.ts` checks each setting moves its target statistic and that none of the 81 combinations beats neutral on both goals for and against or wins more than 58% against it between equal teams.
- Periods: first half, half-time (simulation paused until the user resumes), second half, added time. Kickoff after goals and at the start of each half.

## Action engine (v2, milestone M5b)

Design for the action-level engine that replaces the zone engine (v1). Step 1 (types, dispatch and input validation in `src/engine/action/`) is built; `createMatch` returns a stub `ActionMatch` for a v2 input until the simulation lands. The issues of the epic "action-level match engine" (milestone M5b Action engine) implement it in order. Until the final issue, v1 behaves exactly as described under "Match engine" above.

### What v2 must stay compatible with

- `createMatch(input, seed)` and the `Match` surface (`advanceTo`, `applyChange`, `resume`, `events`, `state`, `changes`) keep their meaning: pause at half-time and full time, reproducible from `seed + input + timed changes`, same result however time is split across `advanceTo` calls, randomness only from the seeded `Rng`.
- Only `src/shared` may be imported by the engine. The engine cannot import `Player`, `Formation` or `Lineup` from `game`, so v2 defines its own input types and `game` maps into them.
- `game` today hands the engine seven phase ratings per team (`TeamMatchProfile`) and the engine knows no players. v2 needs players. Fitness and form already produce effective attributes (`player-condition.ts`); they become the v2 player attributes directly.
- Consumers of the event log that must keep working until v1 is removed: `computeMatchStats`, `momentumSeries`, the terrain (`terrain-events.ts`, `terrain-driver.ts`), `generateCommentary`, `attributeGoalScorers`, `useMatchPlayback`, `MatchScreen`, the half-time panel and `planHalfTime`. They read v1 `MatchEvent`s.
- Saves hold only the `Career` (results as goals, no event logs), so v2 needs no log format in saves, only `engineVersion` (see Persistence below).
- The CI gates stay: `engine` is pure, no `Math.random` or clocks, `ui` uses `engine` only through `index.ts`, balance tests are not weakened, and `neutral-event-logs.json` is never regenerated while v1 exists.

### Public API and versioning

- `MatchInput` becomes a union keyed by `engineVersion`. v1 input has no field or `engineVersion: 1` (both mean v1, so existing code, fixtures and saves stay valid); v2 input has `engineVersion: 2`. `createMatch` is overloaded: a v1 input returns `Match`, a v2 input returns `ActionMatch`. `ActionMatch` has the same control methods; its `events` are `ActionEvent`s.
- v2 code lives in `src/engine/action/` (one concept per file, own tests, own balance tests `action.balance.test.ts`). v1 files are not edited except to add the dispatch. The last issue deletes v1 and the dispatch.
- v2 input (`MatchInputV2`): per side a `TeamSheet` = `{ name, formation, starters, bench, tactics }`. `formation` is `{ defenders, midfielders, forwards }` counts (1 GK implied; the engine does not know formation names). `starters` are 11 `EnginePlayer`s in slot order (GK first, then the lines, each line in lane order left to right). `EnginePlayer` = `{ id, position: "GK" | "DEF" | "MID" | "FWD", attributes }` with the twelve attributes (1 to 20, same names as `game`, already effective). Ids are opaque strings; names stay in `game` and `commentary`.
- `applyChange` in v2 takes `{ side, lineup?, tactics? }` where `lineup` is a new `TeamSheet` starters list (substitutions) and/or new tactics, applied from the next action, consuming no randomness, ignored after full time.
- Random streams: simulation uses `createRng(seed).fork("action-sim")`. Presentation (small position jitter in snapshots, commentary variants) uses separate forks (`"action-presentation"`, `"commentary"`) that never feed back into decisions. Added time keeps its own fork as in v1. Forking does not consume the parent, so adding a stream never changes another.

### Event model

Pitch coordinates are metres: `x` 0 to 105 from the home goal line to the away goal line, `y` 0 to 68 across the width. Home always attacks towards +x (sides are not swapped at half-time, as in v1).

Every `ActionEvent` has `time` (seconds, one decimal), `period`, `team` (the side performing the action), `type`, `actor` (player id), `target` (player id, where relevant), `opponent` (the player who challenged, or the keeper), `from`, `to` (metres), `outcome`, `pressure` (0..1) and `snapshot`.

| Type | Outcomes | Notes |
|---|---|---|
| `pass` (variant `short`, `long`, `through`, `cross`) | `complete`, `intercepted`, `outOfPlay`, `incomplete` | target is the intended receiver; `keyPass` flag when it leads to a shot |
| `carry` (dribble) | `kept`, `tackled`, `outOfPlay` | |
| `shot` | `goal`, `saved`, `blocked`, `missed`, `woodwork` | carries `xg` |
| `tackle` | `won`, `lost`, `foul` | `team` is the tackler |
| `interception` | `won` | |
| `clearance` | `kept`, `outOfPlay` | |
| `foul` | `free kick`, `penalty` | `team` is the fouled side, `opponent` the offender |
| `setPiece` (variant `kickoff`, `throwIn`, `goalKick`, `corner`, `freeKick`, `penalty`) | `taken` | restart position and set-up shape, followed by the first action |
| `periodChange` | | as in v1 |

- `snapshot` is `{ ball: Point, players: readonly Point[] }` with 22 points (home slots 0 to 10, then away 11 to 21) taken at the moment of the action. Every player is inside the pitch. Views interpolate between consecutive snapshots; they never invent positions.
- The ball is always on the pitch or the event is an out-of-play outcome followed by the matching restart `setPiece`.
- Shot outcomes `goal` is followed by a kickoff `setPiece`. A foul in the box gives a penalty.
- Aim: about 1,900 actions per match at a mean of 3 s. Rough budget: ~1,000 passes, ~250 carries, ~25 shots, ~150 tackles, ~100 interceptions, ~50 clearances, ~24 fouls and ~100 restarts.

### Team shape

`teamShape(sheet, tactics, phase, ball, side)` is a pure function that returns the 11 positions of a side.

1. Anchor per slot from the formation (GK, lines, lanes).
2. Phase of play shifts the whole block: `buildUp`, `progression`, `attack`, `defending`, `transition`, `setPiece`. The phase follows possession, ball position and the last action (a turnover starts `transition` for a few actions).
3. Tactics set the parameters: **line height** (pressing and mentality), **width** (width setting) and **compactness** (pressing and mentality). Line height moves the defensive line up or down, width scales the lateral spread, compactness scales the distance between lines.
4. Ball position pulls the block: the block shifts towards the ball (vertical and lateral) and the nearest players press or support.
5. Set pieces have fixed set-ups owned by the engine: corner (takers, near-post and far-post runners, edge-of-box players, counter-attack cover), free kick (wall at 9.15 m, runners), penalty (taker, keeper on the line, everyone else outside the box and the arc), goal kick (keeper, split defenders, pressing line), throw-in (thrower, two options, markers), kickoff (own half, taker and one support in the centre circle).
6. All positions are clamped to the pitch and a minimum distance between players of the same side keeps the shape from collapsing.

Decisions use the shape (pressure = weighted count of opponents within a few metres of the actor and of the target). The shape is a pure function of its inputs; only the snapshot jitter (at most 0.5 m, from the presentation stream, clamped to the pitch) is random, and it is added to the snapshot only, never used in a decision.

### Decisions and outcomes

- The ball carrier builds a list of options: pass to each teammate (short, long, through, cross as variants), carry, shot and clearance. Each option gets a weight from the actor's attributes (passing, vision, dribbling, finishing, ...), the option's geometry (distance, progress, angle, space at the target), the tactics (tempo, directness, width, risk) and the pressure on the actor. The engine draws one option from the weights with the simulation stream.
- The outcome depends on actor against opponent attributes and pressure: pass accuracy from passing and ball control against interceptors' positioning and work rate along the lane; carries from dribbling and pace against the nearest defender's tackling; tackles and fouls from tackling, strength and pressure; shots from finishing, shot geometry (the existing `shotXg` idea, recalibrated), pressure and the keeper's handling and reflexes.
- Every decision and outcome function is pure and takes the `Rng` as the last argument, so it can be tested with a scripted RNG as `transition.test.ts` does today.
- The home side gets a small, named `HOME_ADVANTAGE` constant (applied to action success, tuned in the balance issue).

### Performance and the fast path

- A full match (about 1,900 actions) must simulate in under 50 ms on a laptop (median of repeated runs after warm-up), so other matches of a round can be simulated in the background.
- `createMatch(input, seed, { detail: "fast" })` skips building snapshots and per-event objects that nobody reads (it keeps the score, aggregate stats and the minimal events needed by stats). It must give the same score, the same event types, times, actors, outcomes and xG as `detail: "full"`; a test compares both over many seeds. Positions that decisions need are computed on demand by the same pure shape function, so the fast path cannot diverge. `game` uses the fast path for matches that are not viewed; balance tests use it too.

### Consumers

- **Stats:** `computeActionStats(events, upTo)` gives possession, field tilt, shots, on target, xG, corners, fouls, throw-ins, passes, pass completion, key passes and per-player lines (passes, completion, key passes, shots, xG, tackles, interceptions). `playerRatings(events, players)` gives a 1 to 10 rating per player. Both are pure functions over the log.
- **Momentum terrain:** an adapter `toZoneEvents(actionEvents)` in `src/engine/action/` maps v2 events to v1 `MatchEvent`s (a forward pass or carry becomes `progress`, a sideways one `lateral`, a change of possession `turnover`, shots, goals, corners, fouls and period changes map one to one, intensity from danger and xG). The terrain, `momentumSeries` and the possession and field-tilt stats keep working unchanged. The terrain is never fed raw v2 events.
- **Commentary:** `generateActionCommentary(events, context, seed)` in `src/commentary` names players for chances, key passes, tackles, saves, goals and set pieces in `en` and `sv`, with its own `"commentary"` stream. `context.players` maps id to display name. A goal's scorer comes from the event, so `attributeGoalScorers` is only used for v1.
- **Classic 2D view** (new, part of this milestone; no view like it exists yet): a flat pitch with 22 players and the ball, drawn from interpolated snapshots, with passing chains (recent completed passes of a team as lines) and set-piece line-ups (the engine's set-up positions are shown while the restart is taken). It is an alternative to the momentum terrain, chosen with a toggle on the match screen.
- **Game:** `matchInputFor` builds a `MatchInputV2` from the squad plan and `condition`; `planHalfTime` produces a v2 `MatchChange`; `simulateFixture` and `completeMatchday` pass `engineVersion` and use the fast path.

### Testing

- Unit tests with a scripted RNG per decision and outcome function; exact expectations on deterministic parts (shape, set-up positions, geometry).
- Property tests (dev dependency `fast-check`, MIT; run counts are small by default and raised in the nightly run): for random valid inputs and seeds, **the ball is always on the pitch or the event is an out-of-play outcome**, **there are exactly 22 players in every snapshot**, **every position is within the pitch**, **time never decreases and gaps between actions are 2 to 4 s (except period changes)**, **the same input and seed give the same log however time is split**, **fast and full detail agree**, **score equals the number of goal events**, and **possession alternates only through a turnover event**.
- Balance tests (`action.balance.test.ts`, at least 1,000 seeded matches, average vs average unless noted): goals 2.4 to 3.0, shots 20 to 30, total passes 800 to 1100, pass completion 75% to 88%, corners 8 to 12, fouls 20 to 28, throw-ins 35 to 50, penalties 0.2 to 0.4, total xG within 15% of goals, home win rate 42% to 48%; a clearly stronger team wins at least 55% (and the weaker team at least 10%); each tactic setting moves its target statistic (high press gives more high turnovers and more shots conceded on counters than low press, wide gives more crosses and corners, fast tempo more actions in less time, and so on) and no tactic combination dominates.
- Mutation testing: `src/engine/**` is already in `stryker.config.json`, so v2 files are mutated automatically. The shape, geometry, decision-weight and outcome functions are written as small pure functions with exact-value tests so mutants do not survive on arithmetic; a baseline for v2 is recorded in `docs/mutation-baseline.md` and survivors are treated as missing tests.

### Migration plan

1. Types, dispatch and input validation. 2. Geometry and team shape. 3. Decisions and outcomes. 4. Shots and xG. 5. Match loop (periods, restarts, goals). 6. Set pieces. 7. Tactics and home advantage. 8. Changes and substitutions. 9. Fast path and performance. 10. Property tests. 11. Balance harness and calibration. 12. Stats and ratings. 13. `game` input, results and saves (`engineVersion`, schema v4). 14. Half-time in `game`. 15. Commentary. 16. Terrain adapter and match screen. 17. Stats and ratings UI. 18. 2D view. 19. 2D passing chains and set-piece line-ups. 20. E2E. 21. Mutation baseline. 22. Switch the default to v2 and remove v1 (schema v5).
During steps 1 to 21 a career plays on v1 unless it was created with the experimental v2 engine option; step 22 migrates every career to v2.

## Team ratings from a lineup

- `deriveTeamProfile(club, players)` keeps its meaning: best-eleven 4-4-2 at full condition. `deriveLineupProfile(name, players, lineup, condition)` (`derive-lineup-profile.ts`) is the general case: the starters' `effectiveAttributes` (fitness and form from `condition`, a player id to `PlayerCondition` record; a missing entry is neutral) go through the same attribute-to-phase mapping (`baseRatings` in `phase-ratings.ts`), then the formation's offsets are added and each rating is clamped to 0..1. An invalid lineup (checked with `validateLineup`) throws `RangeError`; callers validate user input first.
- Formation offsets (`formation-offsets.ts`, `FORMATION_OFFSETS`, each at most `MAX_FORMATION_OFFSET` = 0.06 in absolute value, goalkeeping always 0; a test enforces the bound):

| Formation | buildUp | progression | chanceCreation | finishing | pressing | defending | Rationale |
|---|---|---|---|---|---|---|---|
| 4-4-2 | 0 | 0 | 0 | 0 | 0 | 0 | Baseline |
| 4-3-3 | -0.02 | +0.02 | +0.03 | +0.02 | 0 | -0.03 | Three forwards, thinner midfield and defence |
| 4-5-1 | +0.03 | 0 | -0.02 | -0.03 | +0.02 | 0 | Packed midfield, lone striker |
| 3-5-2 | +0.04 | 0 | +0.03 | 0 | +0.01 | -0.04 | More build-up and chances, only three defenders |
| 5-3-2 | -0.01 | -0.02 | -0.04 | 0 | 0 | +0.05 | Solid, few players forward |
| 3-4-3 | 0 | +0.02 | +0.04 | +0.03 | -0.01 | -0.05 | Most attacking, exposed at the back |

- `formation.balance.test.ts` plays every club of 3 generated leagues over 5 seasons of 26 matches with each formation against its own 4-4-2 (equal players); no formation wins or loses more than 55% of its matches (currently all about 36 to 38%).

## Match view

- Consumes the event log only. It never calls engine internals.
- Height field on a grid over the pitch: each event adds a Gaussian bump that decays over time. The ball holder leaves a continuous pulse.
- Colour per vertex: blend of both teams' pressure plus a moving front (territory) between the halves.
- Goals: tall spike, shockwave ring in the scorer's colour, short pause, then reset to kickoff.
- Half-time: the pitch resets; the user makes up to five same-position substitutions and changes tactics in the half-time panel, then starts the second half.
- The match screen (`src/ui/match-view/match-screen.tsx`) composes the terrain with a scoreboard, momentum chart (`momentumSeries`), stats panel (`computeMatchStats`), commentary feed and speed controls. `useMatchPlayback` advances the engine from the wall clock and stops at half-time and full time; `resume(change?)` applies the user's `MatchChange` with `applyChange` before `match.resume()`.
- Half-time panel (`half-time-panel.tsx`): given a `HalfTimeEditor` (squad, plan, condition, a `plan` function wrapping `planHalfTime`) it lists the eleven and bench with fitness and form, pending substitutions (`sub-add`, `sub-off-<n>`, `sub-on-<n>`, `sub-remove-<n>`, at most five) and the shared `TacticsEditor`. "Start second half" validates through `planHalfTime`; an error is shown (`half-time-error`) and the half does not start. With no changes it resumes without a plan, exactly as before. `MatchScreen` keeps the plan's `report` and passes it to `onContinue(score, report?)`; `MatchFlowScreen` forwards it to `completeMatch` and so `completeMatchday`. Nothing is persisted before the result is recorded, and leaving the match restarts it from kickoff with the saved plan; half-time tactics are not written to the career's `squadPlan`. The user's side's scorers (`matchSetup.squads`) come from the plan's starters and bench; time-aware attribution is a later improvement.
- `reference/match-view-prototype.html` is the visual reference (prototype quality, not production code). Its tuning values are a starting point.

## App shell

- Hash routing (`src/ui/routes.ts`, `use-route.ts`): `#/`, `#/league`, `#/club/:clubId`, `#/match`, `#/results`, `#/season-end`, `#/saves`, `#/squad`; unknown hashes show a not-found view. No server support needed.
- The club screen (`club-screen.tsx`, `squad-rows.ts`) is read-only: form chips, next three fixtures, season history, the seven derived phase ratings (0-100) and the squad grouped by position and sortable per group. The best-eleven marking comes from `pickBestEleven`; attribute bands are low 1-7, mid 8-13, high 14-20, always with the number shown. An unknown club id shows the not-found view.
- The club screen also shows fitness and form columns (from `Career.condition`; both sortable).
- The squad screen (`#/squad`, `squad-screen.tsx`, `plan-rows.ts`) edits the user's `squadPlan`: a formation select (switching auto-picks), `auto-pick`, one `<select>` per starter slot (grouped by line, only players of that position) and per bench slot (players used elsewhere are disabled; the only bench keeper cannot be swapped for an outfield player), four tactic selects, the seven phase ratings from `deriveLineupProfile` (`plan-rating-*`) and a sortable table of all 22 players with fitness (warning below 50, always with the number), form and starter/bench/not-in-squad. Edits go through `useCareer().setLineup` / `setTactics` / `autoPickLineup`; a rejected lineup shows `squad-error` and changes nothing. A plan edit is not saved on its own; the next autosave (matchday, new season) carries it. `matchSetupFor` already plays the saved plan.
- The career lives in `useCareer` (`use-career.tsx`), an in-memory store. M4 plugs the `SaveStore` in there without changing screens. Without a career every route except `#/match` shows the new-career screen.
- `#/league` (`league-screen.tsx`) has a Table tab (`league-table.tsx`, built from `computeTable`) and a Fixtures tab (`fixtures-view.tsx`). `LeagueView` takes the career as a prop; `LeagueScreen` reads it from `useCareer`, so new results show without a reload.
- Season flow: the hub shows the next match with "Play match" (`#/match`, `MatchFlowScreen` feeding `MatchScreen` from `matchSetupFor`) and "Quick sim" (`simulateFixture`). Both record the result through `useCareer().completeMatch` (`completeMatchday`) and lead to `#/results`, which lists the round and the user's table position. After the last matchday `#/season-end` shows the `summariseSeason` summary and "Start next season". Guards: `#/match`, `#/results` and `#/season-end` redirect to the hub when there is nothing to show. Leaving a match mid-way records nothing and the next visit restarts from kickoff.
- `App` takes `saveStore`, `fileTransfer`, `now` (ISO clock) and optional `storageAvailable` next to `localeStore`. `main.tsx` passes the IndexedDB store, or the memory store with `storageAvailable={false}` (which shows `StorageWarning`). `CareerProvider` autosaves through the `SaveStore` and exposes `saveStatus`, `lastSavedAt`, `continueAvailable`, `continueInfo`, `loadAutosave()`, `loadError` and `dismissLoadError()`; the header shows `SaveStatus` and the new-career screen shows `ContinuePanel` (Continue button or load error).
- The saves screen (`saves-screen.tsx`, `save-slots.ts`) at `#/saves` lists the `autosave` slot and manual slots `slot-1` to `slot-3` and works without a career (only loading is enabled then). Rows are built with `readSlot` (`readEnvelope` + `parseCareer`); a damaged slot shows "Corrupt save" with only Delete and never breaks the screen. `useCareer` exposes `listSlots()`, `saveToSlot(id)`, `loadSlot(id)` and `deleteSlot(id)`, which return `{ ok } | { ok: false, error }` and never throw. Manual saves get a fresh envelope (`createdAt` and `savedAt` = time of the write); rows show `savedAt`; the autosave slot cannot be written manually. Overwriting a used slot and deleting ask for confirmation; loading replaces the running career without asking and leads to the hub.
- Export and import (`import-save.ts`, `import-controls.tsx`): `App` and `CareerProvider` take a `fileTransfer`; `main.tsx` passes `createBrowserFileTransfer()`. Filled slot rows have "Export" (the stored, migrated envelope via `serializeSave`, named by `saveFileName`) and the saves screen has "Export running career" while a career exists. "Import file" (saves screen and new-career screen) runs `pickFile`, `parseSaveFile` and `parseCareer`; a valid file becomes `importOffer` and the saves screen asks for a manual slot (`import-into-<id>`), confirming before overwriting a used slot, then stores the envelope with its original `createdAt` and highlights the slot (`data-highlighted`). It never replaces the running career. Failures set `importError` (`not-json`, `not-a-save`, `newer-version`, `file-too-large`, `corrupt-career`), shown as `import-error`; cancelling the picker is silent. On the new-career screen a valid pick navigates to `#/saves`.
- The composition root passes `initialSeed` to `App`, so the UI itself never draws randomness and tests stay deterministic.

## Game state (squad plan and condition)

- `Career.squadPlan` (`SquadPlan = Lineup & { tactics }`, `squad-plan.ts`) is the user's formation, starters, bench and tactics. `Career.condition` maps every league player id to `PlayerCondition` (fitness 0..100, form 1..10). Both are plain JSON. `createCareer` starts with `autoPickLineup` for 4-4-2, `NEUTRAL_TACTICS` and `initialConditions`.
- `matchInputFor` derives the user's profile with `deriveLineupProfile` from the plan and `condition`, and the user's tactics from the plan. AI clubs always play `autoPickLineup` 4-4-2 from the current condition with neutral tactics.
- Edits are pure (`edit-squad-plan.ts`): `setLineup(career, lineup)` validates with `validateLineup` and returns `{ ok, career } | { ok: false, error }`, `setTactics(career, tactics)` and `autoPickUserLineup(career, formation)` return a new career.
- Condition per matchday (`update-condition.ts`): `completeMatchday(career, userResult, report?)` plays every fixture with the condition as it was before the round, then `updateConditionAfterMatchday` applies `applyMatchToCondition` and `recoverCondition` to every player. `MatchReport = { minutes: Record<playerId, number> }` gives the user's minutes (absent players played 0); without a report the user's starters count as 90 minutes, which is what the quick sim and `useCareer().completeMatch(result)` pass. AI clubs get 90 minutes for the eleven `autoPickLineup` picks (4-4-2, pre-round condition), 0 for the rest, so tired AI starters rotate out. `startNextSeason` resets every player to full fitness and form 5 and keeps `squadPlan`.
- Half-time (`plan-half-time.ts`): `planHalfTime(career, fixture, { substitutions, tactics? })` is pure and never changes the career. It validates at most `MAX_SUBSTITUTIONS` (5) substitutions in one window, each `{ off, on }` with `off` a starter, `on` a bench player of the same position and nobody used twice (errors `too-many-substitutions`, `duplicate-substitution`, `player-not-on-pitch`, `player-not-on-bench`, `position-mismatch`; checked in that order). It returns `{ ok: true, change, report, lineupAfter }`: `change` is the engine `MatchChange` for the user's side (profile from `deriveLineupProfile` for `lineupAfter` at the current condition, plus the new or unchanged tactics), `report` is the `MatchReport` (starters who stay 90, substituted off 45, came on 45, unused bench 0) and `lineupAfter` has the substitutes in the starters' places and the substituted-off players on the bench slots they left (same formation, valid bench). The UI calls `match.applyChange(change)` at half-time, then `match.resume()`, and passes `report` to `completeMatchday` when the match ends. The same seed, plan and moment give the same match.
- `parseCareer` rejects a bad plan (`invalid-squad-plan`: formation shape, bench size, duplicate, unknown or foreign ids, unknown tactics values) and a bad condition (`invalid-condition`: out-of-range values, a missing or an unknown player).

## Commentary

- `generateCommentary(events, context, seed)` in `src/commentary` turns the event log into feed lines. It is pure and uses its own RNG stream (`createRng(seed).fork("commentary")`), so it never changes the simulation.
- Templates live per locale in `src/commentary/templates` (several variants per event type; a test enforces `en` and `sv` have the same keys). Grammar helpers such as the Swedish genitive are in `grammar.ts`.
- Player names appear only on goals. The scorer of each goal comes from `attributeGoalScorers(events, squads, seed)` in `src/game` (weighted by position and finishing, own RNG stream, no engine draws) and is passed in as `CommentaryContext.scorers`. Every 15 minutes there is a possession summary; half-time and full-time lines carry the score.

## Persistence

- `SaveStore` interface: `list()`, `load(id)`, `save(id, data)`, `delete(id)`.
- `createIndexedDbSaveStore(factory?, dbName?)` (`src/platform/save/indexeddb-save-store.ts`) is the browser implementation: database `touchline` version 1 with one object store `saves` keyed by save id. Every call opens, uses and closes its own connection; open, read and write failures (including blocked opens and aborted transactions) reject with a clear `Error`. `isIndexedDbAvailable()` tells the app when to fall back to the in-memory store. The `indexedDB` global is read only inside these functions, never at import time. It runs the shared `runSaveStoreContract` suite against `fake-indexeddb` (dev dependency).
- Engine version (planned, M5b): schema version 4 adds `Result.engineVersion` and `Career.engineVersion`; the v3 to v4 migration sets both to 1. `completeMatchday` rejects a user result whose `engineVersion` differs from the career's. Old results are never replayed, so removing v1 only means the number 1 stays a label.
- Save format: `{ schemaVersion, createdAt, savedAt, game }` (`createdAt` is when the career was first saved and survives re-saves; `savedAt` is the time of the last write), with a migration per version bump.
- Codec (`src/platform/save`): `createEnvelope(game, now)` and `updateEnvelope(previous, game, now)` build envelopes (the clock is injected; re-saving keeps `createdAt` and sets a new `savedAt`), `readEnvelope(raw)` migrates an untrusted blob to `CURRENT_SCHEMA_VERSION`, rejects one without a valid `savedAt` (`invalid-envelope`) and returns `{ ok, save } | { ok: false, error }`. The codec is game-agnostic (`game: unknown`); the caller runs `parseCareer` afterwards.
- Versioning rule: `schemaVersion` 1 is the M3 `Career` shape; version 2 adds `savedAt` to the envelope (migration: `savedAt = createdAt`); version 3 adds `Career.squadPlan` and `Career.condition` (migration: `addSquadPlanAndCondition` from `src/game` gives the 4-4-2 best eleven, neutral tactics and full condition, so a migrated career plays like before; data it cannot read is left for `parseCareer` to reject). Every change to `Career` or the envelope bumps `CURRENT_SCHEMA_VERSION` in `schema.ts` and adds a `Migration` to `MIGRATIONS`; a test fails if the list is not a gapless chain from 1.
- Fixture policy: `fixtures/career-v1.json`, `career-v2.json` and `career-v3.json` are real saves, frozen and never regenerated. A bump adds `career-v4.json` and keeps the older fixtures, so old saves keep loading.
- Saved and imported data is untrusted: `parseCareer(raw)` in `src/game` rebuilds a `Career` field by field and returns `{ ok, career } | { ok: false, error }` (never throws, never returns the input). Every stored `game` payload goes through it before the UI uses it.
- Save files (`src/platform/save/save-file.ts`): `serializeSave(envelope)` writes pretty-printed JSON; `parseSaveFile(text)` rejects files above 10 MB (`file-too-large`), non-JSON (`not-json`) and otherwise delegates to `readEnvelope`, so it adds no version logic of its own (`invalid-envelope`, `newer-version`, `missing-migration`). `saveFileName({ clubName, season, matchday })` gives `touchline-<club-slug>-s<season>-md<matchday>.json` with Swedish letters folded to ASCII and a safe fallback slug.
- `FileTransfer` (`src/shared`): `download(name, text)` and `pickFile()`. `createBrowserFileTransfer()` uses Blob + object URL (revoked after the click) and a hidden file input; `createMemoryFileTransfer()` records downloads and returns queued files for tests. A Tauri adapter can replace the browser one.
- Autosave (`src/ui/autosave-queue.ts`): slot `autosave`, written after the career is created, after every completed matchday and after starting the next season, never mid-match. `createAutosaveQueue(store, now)` runs writes strictly one after another so the last state wins; `save(game, "new" | "continue")` starts a new `createdAt` or keeps the current one (`adopt` marks a loaded envelope as the one to continue). A failed write rejects only its own promise and never blocks play.
- Startup (`src/ui/find-continue-candidate.ts`): `findContinueCandidate(store)` reads the autosave (or the newest valid save by `savedAt` when there is none) through `readEnvelope` and `parseCareer`. A damaged or newer-version autosave is returned as an error and never falls back to another slot. Nothing is loaded until the user presses Continue.
- E2E (`e2e/persistence.spec.ts`): reload and continue (tagged `@smoke`), manual slot save and load, export a slot and import the downloaded file into another slot, and rejecting a garbage file. Each test runs in a fresh browser context, so IndexedDB starts empty.
- E2E (`e2e/squad-and-tactics.spec.ts`): the M5 flow. Set formation, pressing, tempo and a bench swap on the squad screen; play a match with a half-time substitution and a mentality change; check fitness and form on the squad screen; reload, press Continue and see the plan kept. The derived ratings change with formation and lineup only, not with tactics. A `@smoke` variant changes one tactic, plays a quick-sim matchday (a plan edit is only saved by the next autosave), reloads and checks it is kept.

## Desktop later (Tauri)

The Vite build runs unchanged in Tauri. Adding a Tauri file-system `SaveStore` and a release workflow (tauri-action) should be the only work needed. Keep all browser-specific code in `platform` to protect this.
