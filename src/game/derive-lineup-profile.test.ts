import { describe, expect, it } from "vitest";
import type { TeamMatchProfile } from "../engine";
import { deriveLineupProfile } from "./derive-lineup-profile";
import { deriveTeamProfile } from "./derive-team-profile";
import { FORMATION_SHAPE, FORMATIONS, type Formation } from "./formation";
import { FORMATION_OFFSETS, PHASE_RATINGS } from "./formation-offsets";
import { aClub, aCondition, aFullSquad, aLineup } from "./game-builders";
import { BENCH_SIZE, type Lineup } from "./lineup";
import { pickBestEleven } from "./pick-best-eleven";
import type { Player } from "./player";
import type { PlayerCondition } from "./player-condition";

const squad = (): Player[] =>
  aFullSquad(10).map((p, i) => ({ ...p, passing: 1 + (i % 20), finishing: 20 - (i % 20) }));

const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;

const idsOf = (players: Player[]): string[] => players.map((p) => p.id);

const ratingsOf = (p: TeamMatchProfile): number[] => PHASE_RATINGS.map((k) => p[k]);

const bestElevenLineup = (players: Player[]) => {
  const eleven = idsOf(pickBestEleven(players));
  const bench = idsOf(players.filter((p) => !eleven.includes(p.id))).slice(0, 7);
  return aLineup().withStarters(eleven).withBench(bench).build();
};

/** A valid lineup for `formation` that takes the first players of each position as starters. */
const lineupFor = (formation: Formation, players: Player[]): Lineup => {
  const shape = FORMATION_SHAPE[formation];
  const ofPosition = (position: Player["position"]) =>
    idsOf(players.filter((p) => p.position === position));
  const starters = POSITIONS.flatMap((pos) => ofPosition(pos).slice(0, shape[pos]));
  const rest = idsOf(players).filter((id) => !starters.includes(id));
  const keeper = rest.find((id) => id.includes("-GK-")) as string;
  const bench = [keeper, ...rest.filter((id) => id !== keeper)].slice(0, BENCH_SIZE);
  return { formation, starters, bench };
};

describe("deriveLineupProfile", () => {
  it("equals deriveTeamProfile for the best-eleven 4-4-2 with neutral condition", () => {
    const players = squad();
    const club = aClub().withName("Kvarnby IF").withPlayerIds(idsOf(players)).build();
    const profile = deriveLineupProfile("Kvarnby IF", players, bestElevenLineup(players), {});
    expect(profile).toEqual(deriveTeamProfile(club, players));
  });

  it("treats a player without stored condition as neutral", () => {
    const players = squad();
    const lineup = bestElevenLineup(players);
    const explicit = Object.fromEntries(players.map((p) => [p.id, aCondition().build()]));
    expect(deriveLineupProfile("A", players, lineup, explicit)).toEqual(
      deriveLineupProfile("A", players, lineup, {}),
    );
  });

  it("uses the players of the lineup, not the best eleven", () => {
    const players = aFullSquad(10).map((p) => (p.id === "p-FWD-4" ? { ...p, finishing: 20 } : p));
    const base = aLineup().build();
    const swapped = aLineup()
      .withStarters(base.starters.map((id) => (id === "p-FWD-0" ? "p-FWD-4" : id)))
      .withBench(base.bench.map((id) => (id === "p-FWD-4" ? "p-FWD-0" : id)))
      .build();
    expect(deriveLineupProfile("A", players, swapped, {}).finishing).toBeGreaterThan(
      deriveLineupProfile("A", players, base, {}).finishing,
    );
  });

  it("lowers every rating monotonically as fitness drops", () => {
    const players = squad();
    const lineup = bestElevenLineup(players);
    const at = (fitness: number) =>
      deriveLineupProfile(
        "A",
        players,
        lineup,
        Object.fromEntries(players.map((p) => [p.id, aCondition().withFitness(fitness).build()])),
      );
    const [full, tired, exhausted] = [at(100), at(60), at(0)].map(ratingsOf);
    PHASE_RATINGS.forEach((_, i) => {
      expect(tired?.[i]).toBeLessThan(full?.[i] as number);
      expect(exhausted?.[i]).toBeLessThan(tired?.[i] as number);
    });
  });

  it("raises every rating monotonically as form rises", () => {
    const players = squad();
    const lineup = bestElevenLineup(players);
    const at = (form: number) =>
      ratingsOf(
        deriveLineupProfile(
          "A",
          players,
          lineup,
          Object.fromEntries(players.map((p) => [p.id, aCondition().withForm(form).build()])),
        ),
      );
    const [poor, normal, great] = [at(1), at(5), at(10)];
    PHASE_RATINGS.forEach((_, i) => {
      expect(normal[i]).toBeGreaterThan(poor[i] as number);
      expect(great[i]).toBeGreaterThan(normal[i] as number);
    });
  });

  it("changes ratings by at most the fitness and form factors", () => {
    const players = squad();
    const lineup = bestElevenLineup(players);
    const base = ratingsOf(deriveLineupProfile("A", players, lineup, {}));
    const worst: PlayerCondition = { fitness: 0, form: 1 };
    const low = ratingsOf(
      deriveLineupProfile(
        "A",
        players,
        lineup,
        Object.fromEntries(players.map((p) => [p.id, worst])),
      ),
    );
    // Effective attributes shrink by at most 0.85 * 0.96, so each 0..1 rating by at most that share
    // of its attribute scale (plus the 1..20 offset), never by more than 0.2 in absolute terms.
    PHASE_RATINGS.forEach((_, i) => {
      expect((base[i] as number) - (low[i] as number)).toBeLessThan(0.2);
    });
  });

  it("clamps ratings to 0..1 after the formation offset", () => {
    for (const players of [aFullSquad(20), aFullSquad(1)]) {
      for (const formation of FORMATIONS) {
        const profile = deriveLineupProfile("A", players, lineupFor(formation, players), {});
        for (const r of ratingsOf(profile)) {
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("throws a RangeError for a lineup that does not fit the players", () => {
    const players = squad();
    const lineup = bestElevenLineup(players);
    expect(() => deriveLineupProfile("A", players, { ...lineup, formation: "3-5-2" }, {})).toThrow(
      RangeError,
    );
    expect(() =>
      deriveLineupProfile(
        "A",
        players,
        { ...lineup, starters: ["nobody", ...lineup.starters.slice(1)] },
        {},
      ),
    ).toThrow(RangeError);
  });

  it("returns a profile named by the caller", () => {
    const players = squad();
    expect(deriveLineupProfile("Kvarnby IF", players, bestElevenLineup(players), {}).name).toBe(
      "Kvarnby IF",
    );
  });

  it("applies the formation offset on top of the 4-4-2 ratings", () => {
    const players = aFullSquad(10);
    const base = deriveLineupProfile("A", players, aLineup().build(), {});
    const lineup = lineupFor("3-5-2", players);
    const shifted = deriveLineupProfile("A", players, lineup, {});
    for (const phase of PHASE_RATINGS) {
      expect(shifted[phase]).toBeCloseTo(base[phase] + FORMATION_OFFSETS["3-5-2"][phase], 10);
    }
  });
});
