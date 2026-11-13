# Mutation testing baseline (engine)

First real Stryker run against the engine (`npm run test:mutation`), recorded as a baseline for the nightly workflow. No threshold is enforced yet.

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
