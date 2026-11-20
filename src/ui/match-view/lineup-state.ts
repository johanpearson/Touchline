import type { EnginePlayer, MatchInput, PerSide, TimedActionMatchChange } from "../../engine";

/** Who is where for one side at a moment of the match. */
export type SideLineup = {
  /** The eleven on the pitch, in slot order. */
  onPitch: readonly EnginePlayer[];
  /** Substitutes who have not played. */
  bench: readonly EnginePlayer[];
  /** Players substituted off, in the order they left; they cannot return. */
  off: readonly EnginePlayer[];
};

const initial = (sheet: MatchInput["home"]): SideLineup => ({
  onPitch: sheet.starters,
  bench: sheet.bench,
  off: [],
});

const afterLineup = (
  state: SideLineup,
  lineup: readonly EnginePlayer[],
  everOn: Set<string>,
): SideLineup => {
  const next = new Set(lineup.map((p) => p.id));
  for (const id of next) everOn.add(id);
  return {
    onPitch: lineup,
    bench: state.bench.filter((p) => !everOn.has(p.id)),
    off: [...state.off, ...state.onPitch.filter((p) => !next.has(p.id))],
  };
};

/**
 * Both sides' lineups at presented `matchTime`: the starters with every change the engine applied at
 * or before that time. Changes later than the clock are not shown, so the panel agrees with the
 * feed and the pitch, whatever the engine has already simulated.
 */
export const lineupAt = (
  input: MatchInput,
  changes: readonly TimedActionMatchChange[],
  matchTime: number,
): PerSide<SideLineup> => {
  const states: PerSide<SideLineup> = { home: initial(input.home), away: initial(input.away) };
  const everOn: PerSide<Set<string>> = {
    home: new Set(input.home.starters.map((p) => p.id)),
    away: new Set(input.away.starters.map((p) => p.id)),
  };
  for (const { time, change } of changes) {
    if (time > matchTime || !change.lineup) continue;
    states[change.side] = afterLineup(states[change.side], change.lineup, everOn[change.side]);
  }
  return states;
};
