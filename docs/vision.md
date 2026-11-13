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

## Out of scope (for now)

Multiplayer, real teams or players, rendering of players or ball, online accounts, monetisation.

## Open questions

- How many leagues and divisions in the first playable version (current assumption: one league with 12 to 16 clubs)?
- How detailed should player attributes be (current assumption: around 12 attributes grouped into phases)?
- In-match tactical changes beyond half-time: when in the roadmap?
- Final name of the game.
