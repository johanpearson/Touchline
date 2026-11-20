# Engine pacing: from 1,900 actions to possession phases

Design note for #416. Status: decided, not built. No code changed by this note.

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
