# Engine pacing: from 1,900 actions to possession phases

Design note for #416 and #450. Status: stages 1 to 3 are built and played; the gate (#450) decided **engine v3 is needed** and its plan is below.

## Problem

A match is about 1,900 actions (a pass, carry or tackle every 2 to 4 match seconds, about 1,100 of them passes). Even with the playback director's beats (#415, `docs/architecture.md`, "Playback director"), the playtest verdict is that the match view "doesn't flow and isn't fun to watch". Football Manager shows a match as a short sequence of passages of play, each with one clear outcome, plus commentary on the moments that matter. The log we show is the wrong unit: one pass is not an event a person follows.

## Decision

Reach the Football Manager pace in two stages and measure between them. The expensive stage only starts if the cheap one is not enough.

1. **Phases over the unchanged simulation (do now).** The simulation stays as it is: same actions, same random draws, same results. A pure function groups the log into **possession phases**: one side's uninterrupted control of the ball, from winning it (kick-off, set piece, tackle, interception, clearance caught) until it loses it, shoots or a stoppage ends it. A phase has a start, an end, an outcome, the ordered list of its actions and a danger value. The view, the commentary and the stats read phases; the actions stay as the phase's inner steps.
   - Target: 250 to 400 phases a match (the two sides each have 100 to 150 possessions, the shortest ones, such as a lost header, are merged into the next phase).
   - Because the simulation is untouched, balance, the 81 tactic combinations, mutation scores, ratings, saves and `engineVersion` stay as they are. This is why it comes first.
2. **Playback as one movement per phase.** The director plays a phase as a continuous movement: the ball follows the path of the phase's passes and carries at a steady pace, players move smoothly with it, and only the final action of a phase (shot, chance, tackle that ends it) gets its own slow moment. This replaces the beat grouping as the director's unit (beats become the quiet phases).
3. **Commentary per phase.** One line per phase that matters (a build-up that ends in a shot, a turnover in a dangerous place, a foul, a set piece) with the key action named; quiet phases get at most a short line or none. `generate-action-commentary` keeps working per action for the log.
4. **Gate: engine version 3 (decide after playing 1 to 3).** If the phases still feel like many small steps, change the simulation itself: resolve a phase as one step (a possession-phase step that draws progress, outcome and the involved players, with its inner passes derived from the draw), target 250 to 400 events of 10 to 25 match seconds. That needs `engineVersion: 3`, a retune of `action.balance.test.ts` and the 81 tactic combinations, ratings and stats (pass completion and key passes derive from the inner steps), the position snapshots (one per phase step, with waypoints), `toZoneEvents` and a mutation baseline. It is weeks of work and is only worth it if stage 1 to 3 do not reach the feel. Not agent-ready: a research issue records the playtest verdict and the plan.

## Why not change the engine first

- The balance suites (goals, shots, xG, home win rate, the 81 combinations) are tuned to the current action density; a new model starts them all again. The nightly mutation job is also red today, so the base is not quiet.
- The complaint is about what the user sees, and a phase view can be built and judged in a few sessions. If it fixes the feel, a retune is saved; if not, its output (phase boundaries, danger, waypoints) is what a v3 engine would have to produce, so the work is not wasted.
- Simulation cost is not a problem (median 29 ms a match).

## Phase definition (for the adapter)

- A phase belongs to the side that has the ball at its first action. It ends at the first action after which the other side has the ball (`holderAfter`), at a shot (the shot and its immediate outcome, a corner or rebound that follows, start a new phase), a foul, a goal, out of play, or a period change.
- Fields: `team`, `startTime`, `endTime`, `period`, `actions` (indices into the log), `outcome` (`goal`, `shot`, `turnover`, `foul`, `outOfPlay`, `setPiece`, `periodEnd`), `danger` (the highest xG or nearest approach to goal), `territory` (metres gained towards goal), `passes`, `path` (ball waypoints).
- Phases never cross a period; merging very short phases (fewer than 3 actions and no danger) into the neighbour with the same team keeps the count in range.
- The function is pure, lives in `src/engine/action/` next to `toZoneEvents`, is exported from `src/engine/index.ts` and has no random draws.

## Child work

Tracked under the epic "Football Manager pacing" (M6a). Order: phases adapter, then the director and the commentary in parallel, then the engine v3 research gate.

## Not decided here

- ~~Whether highlights mode shows phases or only the last action of each~~ Decided in #448: whole phases that end in a shot or hold a key moment (the build-up gives a chance its context); see `docs/architecture.md`, "Match playback director".
- Whether the ratings should be computed from phases; no, ratings keep reading actions.

## Verdict after playing stages 1 to 3 (#450)

Stages 1 to 3 are merged (phases #447, one movement per phase #448, commentary per phase #449) and the match was played. Verdict of the maintainer: **it flows better, but engine v3 is needed.** The goal is as close to Football Manager as possible: a person must feel excitement when a goal-scoring chance is built and disappointment when the striker misses. "Now I get 0 of that."

Why stage 1 to 3 cannot give that: the view can only replay what the log holds. In the action log a chance is one `shot` event at the end of a random walk of passes; nothing in the simulation says that this was a *chance* (a through ball, a cut-back, a one-on-one, a free header), who made it, or how close it was (a save with a hand on it, the post, a header just over). Every phase therefore plays with the same weight, and a miss is a one-line outcome. To feel the chance, the simulation has to produce it as a story with a creator, a taker, a situation and a result.

## Engine v3 plan

**Principle: the unit of simulation is the possession phase, and a chance is a first-class event.** `engineVersion: 3`.

### Model

- `PhaseStep` (new, `src/engine/phase/`): `team`, `period`, `startTime`, `endTime` (10 to 25 s), `start` (how the ball was won: kickoff, tackle, interception, goal kick, throw-in, corner, free kick), `chain` (the 2 to 6 players involved, in order, with the ball path as waypoints), `outcome` (`lost` by tackle, interception or bad pass, `foul`, `outOfPlay`, `chance`, `periodEnd`) and, for a chance, `chance`: `{ kind: openPlay | throughBall | cross | cutBack | counter | setPiece | penalty, creator, shooter, situation: oneOnOne | header | edge | box | volley..., xg, result: goal | saved | woodwork | blocked | wide | over, keeper, aftermath: rebound | corner | goalKick | kickoff }`.
- Target: 250 to 400 steps a match (about 310 today as phases), about 25 shots, and **4 to 8 clear chances (xG of 0.25 or more)**; the exact range is set by the retune issue from the first measurements. Goals 2.4 to 3.0, shots 20 to 30, home win rate 42% to 48% stay as they are.
- A step is drawn in stages: progress through build-up, progression and final third (each stage a draw from attacker against defender strengths, tactics and `teamShape`), then the outcome; a chance draws its creator, taker, situation and xG, then one result ladder (goal, then the near misses and saves) so the xG calibration holds and near misses are first-class.
- **Derived action log:** `toActionEvents(steps)` expands every step into the familiar `ActionEvent`s (passes, carries, the shot, restarts) with times and snapshots, drawn from a separate fork (`"inner-actions"`) that never feeds back into the simulation. Stats, ratings, commentary, the classic view and `toZoneEvents` therefore keep working on a log of the same shape; a pass is derived, not simulated. `toPhases` becomes the identity on steps.
- Streams: `createRng(seed).fork("phase-sim")` for decisions, `"inner-actions"` and `"action-presentation"` for presentation. Same seed + input + changes give the same steps however time is split. The fast path skips snapshots as today.
- `createMatch(input, seed, options)` dispatches on `input.engineVersion` (2 or 3) while both exist. v2 is deleted when v3 is the default and green (as the zone engine was in #167).

### Save policy

Results are never replayed and no match is saved mid-way, so v3 is **not breaking**: new careers start with `Career.engineVersion` 3 and a schema migration moves existing careers to 3 (recorded `Result.engineVersion` labels stay). Season-level balance changes slightly, so the retune also covers the game-level suites.

### Work (epic #446, in order)

1. Event model and derived action log (types, `toActionEvents`, property tests).
2. Phase draw: build-up, progression, outcome, involved players.
3. Chances and shot results (creator, situation, xG, near misses, aftermath).
4. Match loop: periods, restarts, changes, energy, added time, fast path, `createMatch` dispatch.
5. Retune: `action.balance`, strength, tactics and the 81 combinations, then formation, league and season suites.
6. Consumers on v3 logs: stats, ratings, `toZoneEvents`, commentary context, chance stats.
7. Game integration: engine version 3 for new careers, migration, results stamp.
8. Match view: chance moments (tension in the build-up, the shot, the reaction to a save, a miss or a goal).
9. Commentary for chances: suspense before the shot, disappointment after a miss.
10. Mutation baseline, performance budget, CI scoping and balance groups for the new files.
11. Remove v2.

Risks: a new model restarts every balance suite and the mutation baseline (95.3% nightly today), so the engine v3 code lives beside v2 until the retune is green; nothing in `src/game` or `src/ui` switches before issue 7.
