# Mutation testing baseline (engine)

First real Stryker run against the engine (`npm run test:mutation`), recorded as a baseline for the nightly workflow. The v1 numbers below were taken with no threshold. Engine v2 (`src/engine/action`) has its own section at the end, and both configs now fail the run below 80%.

- Date: 2026-11-13, after #16 (zone-based match simulation v1)
- Stryker 10.1.1, `vitest` runner, `inPlace: true`, no checker (see #42)
- Run time: about 1.5 minutes

| File | Score | Killed | Timeout | Survived |
| --- | --- | --- | --- | --- |
| All files | **78.63%** | 202 | 4 | 56 |
| `transition.ts` | 63.30% | 69 | 0 | 40 |
| `create-match.ts` | 80.00% | 21 | 3 | 6 |
| `xg.ts` | 85.71% | 12 | 0 | 2 |
| `rng.ts` | 90.57% | 47 | 1 | 5 |
| `match-builders.ts` | 92.11% | 35 | 0 | 3 |
| `pitch.ts` | 100.00% | 18 | 0 | 0 |

## Weak spots

- `transition.ts` (40 of 56 survivors): arithmetic operators in the probability formulas (`progressChance`, `shootChance`, turnover and corner chances) and the `>` vs `>=` shooting-zone boundary. Only seeded whole-match tests exercise them, so no test pins an individual formula.
- `transition.ts` and `create-match.ts`: string literal mutants, mostly event type or label strings that no test asserts on.
- `xg.ts`: the centrality and closeness arithmetic is not pinned by exact values.
- `rng.ts`, `match-builders.ts`: a handful of boundary and default-value survivors.

Per `CLAUDE.md`, treat survivors as missing tests. Re-run with `npm run test:mutation` and compare against this table.

## After #47 (transition tests)

`transition.test.ts` tests the zone model with a scripted RNG. It asserts behaviour and relationships (a better attacker raises the shoot chance, a better keeper lowers the goal chance, probabilities stay clamped, the shooting-zone boundary), not exact formula values, so retuning the formulas does not break it.

| File | Score |
| --- | --- |
| All files | **93.51%** |
| `transition.ts` | 99.08% |

The one remaining `transition.ts` survivor changes the exact intensity formula of progress events. Pinning it would tie a test to a tuning value, so it is left alive on purpose.

## After #48 (remaining survivors)

| File | Score |
| --- | --- |
| All files | **98.86%** |
| `create-match.ts`, `rng.ts`, `xg.ts`, `pitch.ts` | 100% |
| `match-builders.ts` | 94.74% |
| `transition.ts` | 99.09% |

Three survivors are left on purpose:

- `match-builders.ts` (2): `build()` copies `homeTactics` and `awayTactics`, but `MatchInput` tactics are empty today and the builder cannot set them, so replacing the copy with `{}` is indistinguishable. Revisit when tactics get fields and builder methods.
- `transition.ts` (1): the exact intensity formula of progress events (see above).

## Action engine (v2), #166

Baseline for `src/engine/action`, run with `npm run test:mutation:action` (`stryker.action.config.json`). The engine-wide config (`stryker.config.json`, nightly) covers the same files plus v1.

- Date: 2026-11-15, Stryker 10.1.1, `vitest` runner, `inPlace: true`, `coverageAnalysis: "perTest"`, `ignoreStatic: true`
- Run time: about 2 hours for the whole folder on four cores (2,940 mutants), so it is a nightly job, not a PR check
- Tests: `vitest.mutation-action.config.ts` leaves out two slow files, `fast-detail.test.ts` (200 seeded matches) and `action-match.property.test.ts`. Mutants only those would kill count as survivors, so the scores are a **lower bound**. The nightly engine-wide run keeps them.
- Not mutated: test files, `arbitraries.ts`, `performance.bench.ts`, `measure-match-time.ts`, `balance-test-support.ts` and the `*-builders.ts` helpers (test support, not engine behaviour).
- Score = (killed + timeout) / (killed + timeout + survived + no coverage).

The first full run gave 87.69%, with `snapshot.ts` (33%), `create-action-match.ts` (57%) and `action-balance.ts` (68%) under 70%. The causes were no unit test for the snapshot jitter, a summary test that computed its results at describe level (Stryker cannot attribute that to a test, so every mutant looked uncovered), and `create-action-match.test.ts` being left out of the run. After fixing those three, they were measured again on their own; the table merges both runs.

Overall: **90.58%** (2,663 killed or timed out, 273 survived, 4 without coverage).

| File | Score | Killed | Survived | No coverage |
| --- | --- | --- | --- | --- |
| `pressure.ts` | 75.00% | 21 | 7 | 0 |
| `play-action.ts` | 82.18% | 226 | 49 | 0 |
| `resolve-carry.ts` | 84.51% | 60 | 11 | 0 |
| `create-action-match.ts` | 84.85% | 140 | 25 | 0 |
| `team-shape.ts` | 84.88% | 146 | 25 | 1 |
| `restart-taker.ts` | 87.50% | 28 | 4 | 0 |
| `set-piece-shape.ts` | 87.50% | 259 | 37 | 0 |
| `resolve-clearance.ts` | 89.86% | 62 | 7 | 0 |
| `player-ratings.ts` | 90.57% | 96 | 7 | 3 |
| `action-balance.ts` | 91.04% | 122 | 12 | 0 |
| `build-options.ts` | 91.35% | 169 | 16 | 0 |
| `out-of-play.ts` | 91.43% | 96 | 9 | 0 |
| `validate-match-input-v2.ts` | 91.96% | 103 | 9 | 0 |
| `limit-snapshot-speed.ts` | 92.00% | 23 | 2 | 0 |
| `tactics-parameters.ts` | 92.31% | 12 | 1 | 0 |
| `resolve-interception.ts` | 92.86% | 26 | 2 | 0 |
| `resolve-challenge.ts` | 93.06% | 67 | 5 | 0 |
| `action-balance-metrics.ts` | 93.81% | 106 | 7 | 0 |
| `action-stats.ts` | 94.03% | 189 | 12 | 0 |
| `resolve-shot.ts` | 94.08% | 159 | 10 | 0 |
| `keep-actor-on-ball.ts` | 94.12% | 16 | 1 | 0 |
| `mark-key-passes.ts` | 94.44% | 34 | 2 | 0 |
| `choose-option.ts` | 94.44% | 17 | 1 | 0 |
| `to-zone-events.ts` | 95.10% | 97 | 5 | 0 |
| `separate-players.ts` | 96.15% | 75 | 3 | 0 |
| `apply-change-to-input.ts` | 96.43% | 27 | 1 | 0 |
| `shot-xg.ts` | 97.67% | 42 | 1 | 0 |
| `resolve-pass.ts` | 98.56% | 137 | 2 | 0 |
| `attribute-rating.ts` | 100.00% | 3 | 0 | 0 |
| `home-advantage.ts` | 100.00% | 4 | 0 | 0 |
| `pitch-metres.ts` | 100.00% | 25 | 0 | 0 |
| `snapshot.ts` | 100.00% | 12 | 0 | 0 |
| `tactic-combinations.ts` | 100.00% | 4 | 0 | 0 |
| `action-duration.ts` | 100.00% | 7 | 0 | 0 |
| `segment-distance.ts` | 100.00% | 21 | 0 | 0 |
| `team-phase.ts` | 100.00% | 32 | 0 | 0 |


### What the new tests do

They assert behaviour and relationships, not tuning values: scripted RNG draws exactly on a boundary, spec-level checks of the ball pull and close-in rules, cross-checks of summaries against an independent replay, and exact table output. Retuning the constants should not break them.

### Survivors left on purpose

- Equivalent mutants: `<` vs `<=` on float boundaries that an RNG never hits exactly, `dx >= 0` vs `dx > 0`, division by +1 or -1, and symmetric box runners (`centre_y +/- r.y`).
- Dead `"missed"` fall-through strings and redundant sub-conditions such as the perf-skip check in `resolve-pass.ts`.
- RNG fork names (`root.fork("action-sim")` and similar): renaming a stream only changes which numbers come out, and no test pins an exact match.
- `play-action.ts`: see "After #208" below.

Per `CLAUDE.md`, treat survivors as missing tests. Compare later runs against this table; the nightly job fails below 80%.

## After #208 (`play-action.ts`)

Scripted-RNG tests in `play-action.test.ts` pin the press bonus (own half only, including the halfway-line boundary), the opponent's home edge on interceptions and kept carries, the interceptor `opponent` field (present on an intercepted pass, absent otherwise), `keptBonus`, the transition effect on option weights, the goalkeeper never challenging the carrier and the phase passed to `shapesFor`. Measured with `npx stryker run stryker.action.config.json --mutate src/engine/action/play-action.ts` (same lower-bound test selection as above).

| File | Before | After | Killed | Survived |
| --- | --- | --- | --- | --- |
| `play-action.ts` | 82.55% | **93.45%** | 257 | 18 |

The 18 survivors. Reasoned as equivalent:

- Lines 118 and 156 (`<` vs `<=`): two players at exactly the same distance from the ball; the shapes never produce that tie.
- Line 96 (`shapeOf("away")` to `shapeOf("")`): `teamShape` treats any side that is not `home` as away, so the result is identical.
- Line 108 (default `skip` array): the default is never read with a slot in it.
- Line 196 (`actionDuration("setPiece", ...)`): the type argument is unused (`_type`).
- Lines 303 and 404 (`slot !== undefined` forced true): when the slot is absent (a cross that ends in a corner), `starters[undefined]` is `undefined`, the same as the guard.

Not killed, left alive because the file is above the 90% target (not claimed equivalent): lines 137 and 143 (branches of `afterResolution` that look redundant with what the resolvers return), 320, 325 and 386 (the `penalty` flag passed to `resolveShot`, which only changes the outcome for a draw in the blocked band with a defender on the lane), 328 (three, the first-pass guard), 334 (the `challenger !== undefined` guard), 355 (`restart?.variant`) and 426 (the carrier left in `teammates`). Each needs a dedicated scenario and is a candidate for a later pass.

## Nightly run as parallel shards (#209)

The engine-wide nightly run used to be one job (limit 6 hours). The first scheduled run of it on 2026-11-16 had not finished after 3 hours 40 minutes, so it is now split into parallel shards with a plan job and a merge job (see "Nightly mutation shards" in `docs/architecture.md`); the target is one hour, two hours at most.

First sharded run (manual, 2026-11-16, run 43814465994): 8 shards of equal source size (20.6 kB each) took 3, 8, 10, 18, 22, 41 and 60 minutes, and the eighth (`create-action-match.ts`, `team-shape.ts`, `resolve-challenge.ts`, `shot-xg.ts`, `keep-actor-on-ball.ts`, `attribute-rating.ts`, `tactics.ts`) was still running after 75 minutes with a forecast of more than 3 hours, so it hit the 120 minute limit. File size is a poor guide to cost: a mutant re-runs every test that covers it, and the initial test run of shard 8 took 3 min 59 s (491 tests) against 1 min 17 s for shard 1 (312 tests), because the two hot files are covered by the slow whole-match tests. The shards are therefore balanced by estimated minutes (`scripts/mutation-weights.json`), the merge job prints the measured minutes of every shard with its files, and the estimates are refreshed from that. The mutated files are those of `stryker.config.json`, which leaves out the same test support as `stryker.action.config.json` (`arbitraries.ts`, `performance.bench.ts`, `measure-match-time.ts`, `balance-test-support.ts`, `*-builders.ts`), so scores are comparable with the action-engine baseline above but not with the first rows of this file, which also counted the builders.

First balanced run (manual, 2026-11-16, run 43829018324, commit `0df9967`, 15 shards): **wall time 83.4 minutes** (longest shard) and a **merged score of 95.78%** (2,463 killed, 466 timed out, 125 survived, 4 without coverage; the 80% break threshold held). It finished inside the 2 hour limit but not inside the 1 hour target, because one shard was 4 times slower than the plan expected.

| Shard | Measured | Files |
| --- | --- | --- |
| 9 | 83.4 min | `build-options.ts`, `segment-distance.ts`, `shape-constants.ts`, `to-zone-events.ts` |
| 14 | 39.2 min | `resolve-pass.ts`, `restart-taker.ts`, `separate-players.ts` and four small files |
| 15 | 22.0 min | `out-of-play.ts`, `resolve-shot.ts`, `mark-key-passes.ts` and four small files |
| 4, 1, 2 | 20.9, 20.6, 19.9 min | `set-piece-shape.ts:187-392`, `create-action-match.ts` (then one file), `team-shape.ts:139-205` |
| the other 8 | 1.9 to 17.6 min | the rest, including `play-action.ts` (shard 12, 12.5 min) |

What the run showed:

- `build-options.ts` was estimated at 14 minutes and took about 78. It has 185 mutants, 108 of them timeouts: a mutant that makes a loop or a weight run away is only killed when it hits Stryker's timeout, so timeouts cost far more than ordinary kills. File size and mutant count do not predict this.
- `team-shape.ts` was estimated at 85 minutes and took about 28 in total, so it no longer needs to be cut into five ranges. `set-piece-shape.ts` was estimated at 40 and took about 26.
- Setup per shard (checkout, install, the initial test run) is about 2 minutes, not the 5 the plan assumes, so the shard count is a little high and safe.
- Sharding did not change the score: 95.78% is above the action-folder lower bound of 90.58% because the engine-wide run includes the slow tests (`fast-detail.test.ts`, `action-match.property.test.ts`) that the action config leaves out. Files under 90%: `pressure.ts` (78.57%) and `momentum-series.ts` (79.41%).

Decisions for #209:

- Timeout and break threshold stay as they are (120 minutes per shard, 80%): the longest shard is under the limit and the score is 15 points above the threshold.
- `scripts/mutation-weights.json` is refreshed from the measured shard times (see its `comment`). With the new estimates the plan makes 11 shards of about 29 to 31 estimated minutes, with `build-options.ts` cut into four line ranges. The next nightly run should show a wall time of about 35 minutes; if the longest shard differs a lot from the plan, refresh the weights from the merge log again.
- `fast-detail.test.ts` and `action-match.property.test.ts` are **not** added to `stryker.action.config.json`. The nightly run, which does include them, is now the reference score; the action config is the local, faster check and adding two slow suites would make it slower than the nightly job. Its scores stay a lower bound.
- Possible later work: `build-options.ts` has many timeout mutants; a lower `timeoutFactor` for the shard config or a test that kills them earlier would shorten the run. Not done here because it changes what counts as killed.

### Second balanced run (manual, after #245)

Run 43843846345 (2026-11-16, commit `408af16`, 15 shards of the plan from #245): **wall time 119.5 minutes** and a **merged score of 97.04%**. It passed, but shard 3 ended 30 seconds before its 120 minute limit, so the plan is not safe yet and the 1 hour target is missed.

| Shard | Measured | Files |
| --- | --- | --- |
| 3 | 119.5 min | `team-shape.ts` (whole file), `change-loop.ts`, `limit-snapshot-speed.ts`, `open-play-types.ts`, `pressure.ts` |
| 9 | 53.1 min | `advance-loop.ts`, `limit-event-snapshot.ts`, `loop-state.ts`, `resolve-carry.ts`, `separate-players.ts`, three small files |
| 10 | 42.9 min | `create-action-match.ts`, `player-ratings.ts`, `resolve-challenge.ts`, `resolve-clearance.ts`, `resolve-shot.ts` and three small files |
| 11 | 34.1 min | `out-of-play.ts`, `shot-xg.ts`, `to-zone-events.ts` and four small files |
| 8 | 31.4 min | `play-action.ts`, `restart-taker.ts` and six small files |
| the other 7 | 6.8 to 20.2 min | the three other `build-options.ts` line ranges, `set-piece-shape.ts`, and small files |

What the run showed:

- The first balanced run showed `team-shape.ts` at about 28 minutes in four line ranges, so #245 lowered its estimate to 20 minutes and the plan stopped cutting it. As a single unit it took about 117 minutes. Cutting a file into line ranges is therefore much cheaper than the sum of its parts suggests, and the same may hold for other large files. The weight of `team-shape.ts` is back at 85 so that the plan cuts it into four ranges again (the weights file explains this in its `comment`).
- `build-options.ts` in four line ranges took 7 to 20 minutes per range, about 35 minutes in total, against 78 minutes as a single unit in the first run. Ranges also cut the cost of its timeout mutants.
- Shards 9, 10 and 11 took 1.4 to 2.1 times their estimate; their weights are refreshed from this run.
- The merged score rose from 95.78% to 97.04%: `play-action.ts` 93.45% to 99.64%, `pressure.ts` 78.57% to 92.86%, and the `build-options.ts` ranges stayed at 100%. Files under 90% are `momentum-series.ts` (79.41%, unchanged).
- Setup per shard is still about 2 minutes.

Next steps: with the refreshed weights the plan makes 16 shards of about 28 to 33 estimated minutes (the maximum shard count). If the next run's longest shard is still far above that, the next lever is the line-range cut for more files (weight above 25), not a longer timeout; see #244 for the timeout mutants.

### Third balanced run (manual, after #277)

Run 43864011566 (2026-11-16, commit `4e650a6`, 16 shards of the plan from #277): **wall time 61.4 minutes** and a **merged score of 96.49%** (above the 80% break threshold). It is inside the 2 hour limit and only just over the 1 hour target, but the slowest shard took about twice the plan's 28 to 33 minutes.

| Shard | Measured | Files |
| --- | --- | --- |
| 16 | 61.4 min | `action-balance-metrics.ts`, `out-of-play.ts`, `shot-xg.ts` and three small files |
| 12 | 31.0 min | `action-stats.ts`, `apply-change-to-input.ts`, `limit-snapshot-speed.ts`, `pressure.ts`, `separate-players.ts` |
| 2, 15, 1 | 24.2, 23.1, 22.2 min | `build-options.ts:55-131`; `choose-option.ts`, `resolve-shot.ts` and three more; `team-shape.ts:139-205` |
| the other 12 | 4.4 to 19.3 min | the rest, including the other three `team-shape.ts` and `build-options.ts` ranges |

What the run showed:

- Cutting `team-shape.ts` into four line ranges worked: the ranges took 22.2, 14.8 (shared), 8.0 (shared) and 4.4 (shared) minutes, against 117 minutes as one unit in the second run. The slowest `build-options.ts` range took 24.2 minutes.
- Shard 16 is the only shard far above its estimate (about 28 minutes planned, 61 measured). Its heavy files are `out-of-play.ts` and `shot-xg.ts` (35 and 37 timed-out mutants): in the second run they shared a 34 minute shard with four other files. The log cannot say which file took the time, so their weights are scaled up in proportion to their estimates (each is now below the 25 minute cut-off, so they are not cut, but they no longer share a shard with each other by default).
- Timeout mutants drive the variance (see #244); runner speed also moves them.
- Merged score: 96.49% (97.04% in the second run); no file fell below 79.41% (`momentum-series.ts`, unchanged).

Next steps: read the next nightly. If the slowest shard is still above 45 minutes, cut `out-of-play.ts` and `shot-xg.ts` into line ranges (weight above 25) and consider #244.

### Fourth balanced run (manual, after #285)

Run 43876008326 (2026-11-16, commit `572e70a`, 16 shards): **wall time 37.6 minutes** and a **merged score of 96.97%**. This meets the 1 hour target (second run: 119.5 min, third: 61.4 min) with the weights from #285.

| Shard | Measured | Files |
| --- | --- | --- |
| 6 | 37.6 min | `set-piece-shape.ts`, `resolve-clearance.ts`, `action-duration.ts` and two small files |
| 4 | 36.3 min | `out-of-play.ts` and four small files |
| 14, 12 | 30.7, 28.8 min | `choose-option.ts`, `player-ratings.ts`, `separate-players.ts` and two more; `create-action-match.ts`, `resolve-challenge.ts` and three more |
| the other 12 | 4.1 to 24.8 min | the rest, including the four `team-shape.ts` and four `build-options.ts` line ranges (21.6 and 19.9 min for the largest) |

What the run showed:

- The slowest shard went from 61.4 to 37.6 minutes. The plan estimated about 31 for every shard, so the two slowest are within about 20% of it and no shard is a clear outlier any more.
- `out-of-play.ts` (shard 4, 36.3 min with four small files) is the heaviest single file, about 30 minutes; `shot-xg.ts` took 9.8 minutes with `pitch.ts`. The scaled-up weights from #285 were therefore right for `out-of-play.ts` and too high for `shot-xg.ts`; the plan is within the target, so they are left as they are.
- Merged score 96.97% (96.49% in the third run). The run to run spread of one shard (shard 16 at 61.4 min, then the same files in shards 3, 4 and 13 at 9.8, 36.3 and 18.9 min) is the reason to keep the plan's margin.
- The 80% break threshold and the 120 minute shard limit are unchanged and not close to being hit.

Next steps: the weights are good enough, so nothing further is changed for #209. #244 (cost of timed-out mutants) remains the way to shorten the run further, but its target of 45 minutes for the slowest shard is already met; it is now an optimisation, not a need.
