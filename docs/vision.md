# Vision

## Concept

A football management game inspired by Football Manager, but smaller: fewer screens and attributes, faster seasons, still real depth in tactics, squad building and player development. Played mainly on desktop, in the browser.

## Core loop

1. Pick a fictional club in a generated league.
2. Set lineup, formation and tactics.
3. Play matches in the momentum match view, react at half-time (substitutions, tactics).
4. Manage the squad between matches: training focus, transfers, contracts, youth.
5. Finish the season, get promoted or relegated, continue the next season.

## Decisions

| Topic | Decision |
|---|---|
| Platform | Desktop browser first (1280 px and wider). Mobile is a late milestone. |
| Stack | TypeScript, Vite, React for screens, three.js for the match view. Chosen because coding agents work well with it. |
| Hosting | GitHub Pages (free). Later packaged as a desktop app with Tauri. |
| Backend | None. Single player, all logic runs in the client. |
| Saving | IndexedDB behind a `SaveStore` interface, autosave, export/import as JSON. Tauri file storage later. |
| Data | Fully fictional clubs, players and leagues. No licensing issues. |
| Language | Repo in English. Game in English and Swedish. |
| Match engine | Deterministic, seeded, zone-based event simulation. The event log drives the match view, commentary and stats. |
| Match view | Animated 3D height map of the pitch: height shows pressure, colour shows which team dominates, the front between colours moves with territory. Big spike and shockwave on goals. No players or ball drawn. |
| Quality | TDD, high coverage, balance tests on the engine, nightly mutation testing. |
| Cost | Everything free: tooling, hosting, CI. |
| League size (M3) | One league with **14 clubs**, double round-robin (each pair meets home and away), 26 matchdays. The size is a parameter (even number, 12 to 16) so it can change without rewrites. |
| Player attributes (M3) | **12 attributes**, integers 1 to 20: passing, ball control, dribbling, pace, vision, finishing, work rate, tackling, positioning, strength (outfield) and handling, reflexes (goalkeeper). A team's seven engine phase ratings (0..1) are derived from the lineup's attributes in `game`; the engine keeps its `TeamMatchProfile` input unchanged. |
| Season format (M3) | Single league, no promotion or relegation yet. At season end the champion and final table are shown and the user can start the next season with the same clubs (new fixtures, same ratings until player development arrives in M6). Promotion and relegation need several divisions and are a later milestone. |
| Table tie-breakers (M3) | Points, then goal difference, then goals scored, then head-to-head points, then club name (alphabetical) as a final deterministic fallback. |
| Matchday flow (M3) | The user's match is played in the match view or skipped with a quick sim (same engine and seed, no animation). All other matches of the round are simulated instantly with the same engine when the matchday is completed. Matchdays are played in order; the user cannot skip a matchday. |
| AI lineups (M3) | Until the squad and tactics milestone (M5), every club (including the user's) plays its best eleven in a fixed 4-4-2 picked automatically from the squad. |
| Home advantage (M3) | None. The engine has no home advantage today; adding it is an engine change that needs its own balance work and is out of scope for M3. |
| Game state shape | All career and season state is plain JSON-serialisable data (no `Map`, `Set`, `Date`, classes or functions) so M4 can save it unchanged. Entities reference each other by string id. All randomness derives from the career seed through `createRng(...).fork(name)`. |
| Save slots (M4) | One **autosave** slot (`autosave`) plus **3 manual slots** (`slot-1` to `slot-3`). One running career at a time. |
| Autosave (M4) | The career is autosaved after it is created, after every completed matchday and after starting the next season, never mid-match (leaving a match restarts it from kickoff, as in M3). On startup the app offers "Continue" from the autosave (or the newest save when the autosave is missing). Autosave failures are shown but never block play. |
| Save content (M4) | A save stores the `Career` (plain JSON, see "Game state shape") inside the `SaveEnvelope`. `schemaVersion` **1** is the M3 `Career` shape and **2** adds `savedAt` (time of the last write; v1 saves get `savedAt = createdAt`); `createdAt` stays the time of the first save. Every later change of that shape bumps the version and ships a migration with a test and a frozen fixture. The locale preference is not part of a save (it stays in `localStorage`). `createdAt` comes from a clock injected at the composition root, because `game` must not read the time. |
| Export and import (M4) | Export writes the envelope as pretty-printed JSON, file name `touchline-<club-slug>-s<season>-md<matchday>.json`. Import validates and migrates the file and stores it in a manual slot the user picks (confirming before overwriting a used slot); it never replaces the running career directly. Invalid or newer-version files are rejected with a message. |
| Storage fallback (M4) | If IndexedDB is unavailable (private mode, blocked storage) the app falls back to the in-memory store, shows a persistent warning that progress will be lost on reload, and export still works. |
| Test dependency (M4) | `fake-indexeddb` (MIT, dev dependency only) lets the IndexedDB adapter run the `SaveStore` contract suite in Vitest. No new runtime dependency. |
| Names | Club, player and league names are generated data (proper nouns), not UI strings, so they are not translated. Pools are Swedish-flavoured fictional names. |

## Out of scope (for now)

Multiplayer, real teams or players, rendering of players or ball, online accounts, monetisation.

## Open questions

- ~~How many leagues and divisions in the first playable version?~~ Decided for M3: one league, 14 clubs (see Decisions). Several divisions with promotion and relegation: when?
- ~~How detailed should player attributes be?~~ Decided for M3: 12 attributes (see Decisions). Revisit when player development (M6) lands.
- ~~How are saves organised?~~ Decided for M4: autosave plus 3 manual slots, JSON export/import (see Decisions). Cloud sync stays out of scope.
- In-match tactical changes beyond half-time: when in the roadmap?
- Final name of the game.
