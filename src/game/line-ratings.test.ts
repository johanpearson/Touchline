import { describe, expect, it } from "vitest";
import { FORMATION_SHAPE, type Formation } from "./formation";
import { aClub, aCondition, aFullSquad, aLineup } from "./game-builders";
import {
  deriveClubLineRatings,
  deriveLineRatings,
  LINE_RATINGS,
  lineRatings,
} from "./line-ratings";
import { BENCH_SIZE, type Lineup } from "./lineup";
import { pickBestEleven } from "./pick-best-eleven";
import type { Player } from "./player";
import type { PlayerCondition } from "./player-condition";

const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;
const idsOf = (players: Player[]): string[] => players.map((p) => p.id);

/** A valid lineup for `formation` that takes the first players of each position as starters. */
const lineupFor = (formation: Formation, players: Player[]): Lineup => {
  const shape = FORMATION_SHAPE[formation];
  const starters = POSITIONS.flatMap((pos) =>
    idsOf(players.filter((p) => p.position === pos)).slice(0, shape[pos]),
  );
  const rest = idsOf(players).filter((id) => !starters.includes(id));
  const keeper = rest.find((id) => id.includes("-GK-")) as string;
  const bench = [keeper, ...rest.filter((id) => id !== keeper)].slice(0, BENCH_SIZE);
  return { formation, starters, bench };
};

const everyone = (players: Player[], condition: PlayerCondition) =>
  Object.fromEntries(players.map((p) => [p.id, condition]));

describe("lineRatings", () => {
  it("rates a line as the mean overall of its starters, rescaled from 1..20 to 0..100", () => {
    const ratings = lineRatings([
      { position: "GK", overall: 20 },
      { position: "DEF", overall: 1 },
      { position: "DEF", overall: 11 },
      { position: "MID", overall: 10.5 },
      { position: "FWD", overall: 1 },
    ]);

    expect(ratings.goalkeeping).toBe(100);
    expect(ratings.defence).toBeCloseTo((5 / 19) * 100);
    expect(ratings.midfield).toBeCloseTo((9.5 / 19) * 100);
    expect(ratings.attack).toBe(0);
  });

  it("rates the overall as the mean of all starters", () => {
    const ratings = lineRatings([
      { position: "GK", overall: 1 },
      { position: "DEF", overall: 20 },
    ]);

    expect(ratings.overall).toBeCloseTo(50);
  });

  it("rates a line without players 0", () => {
    expect(lineRatings([{ position: "GK", overall: 20 }]).attack).toBe(0);
  });

  it("lists the five ratings in display order", () => {
    expect(LINE_RATINGS).toEqual(["goalkeeping", "defence", "midfield", "attack", "overall"]);
  });
});

describe("deriveLineRatings", () => {
  const squad = (): Player[] =>
    aFullSquad(10).map((p, i) => ({ ...p, tackling: 1 + (i % 20), finishing: 20 - (i % 20) }));

  it("equals the club ratings for the best-eleven 4-4-2 with neutral condition", () => {
    const players = squad();
    const eleven = idsOf(pickBestEleven(players));
    const bench = idsOf(players.filter((p) => !eleven.includes(p.id))).slice(0, BENCH_SIZE);
    const club = aClub().withPlayerIds(idsOf(players)).build();

    const lineup = aLineup().withStarters(eleven).withBench(bench).build();

    expect(deriveLineRatings(players, lineup, {})).toEqual(deriveClubLineRatings(club, players));
  });

  it("uses the players of the lineup, not the best eleven", () => {
    const players = aFullSquad(10).map((p) => (p.id === "p-FWD-4" ? { ...p, finishing: 20 } : p));
    const base = aLineup().build();
    const swapped = aLineup()
      .withStarters(base.starters.map((id) => (id === "p-FWD-0" ? "p-FWD-4" : id)))
      .withBench(base.bench.map((id) => (id === "p-FWD-4" ? "p-FWD-0" : id)))
      .build();

    expect(deriveLineRatings(players, swapped, {}).attack).toBeGreaterThan(
      deriveLineRatings(players, base, {}).attack,
    );
  });

  it("changes with the formation, because other players make up each line", () => {
    const players = squad();

    const four = deriveLineRatings(players, lineupFor("4-4-2", players), {});
    const three = deriveLineRatings(players, lineupFor("3-4-3", players), {});

    expect(three.defence).not.toBeCloseTo(four.defence);
    expect(three.attack).not.toBeCloseTo(four.attack);
  });

  it("treats a player without stored condition as neutral", () => {
    const players = squad();
    const lineup = lineupFor("4-4-2", players);

    expect(deriveLineRatings(players, lineup, everyone(players, aCondition().build()))).toEqual(
      deriveLineRatings(players, lineup, {}),
    );
  });

  it("lowers every line as fitness drops", () => {
    const players = squad();
    const lineup = lineupFor("4-4-2", players);
    const at = (fitness: number) =>
      deriveLineRatings(
        players,
        lineup,
        everyone(players, aCondition().withFitness(fitness).build()),
      );

    const [full, tired, exhausted] = [at(100), at(60), at(0)];

    for (const line of LINE_RATINGS) {
      expect(tired[line]).toBeLessThan(full[line]);
      expect(exhausted[line]).toBeLessThan(tired[line]);
    }
  });

  it("raises every line as form rises", () => {
    const players = squad();
    const lineup = lineupFor("4-4-2", players);
    const at = (form: number) =>
      deriveLineRatings(players, lineup, everyone(players, aCondition().withForm(form).build()));

    const [poor, normal, great] = [at(1), at(5), at(10)];

    for (const line of LINE_RATINGS) {
      expect(normal[line]).toBeGreaterThan(poor[line]);
      expect(great[line]).toBeGreaterThan(normal[line]);
    }
  });

  it("throws a RangeError for a lineup that does not fit the players", () => {
    const players = squad();
    const lineup = lineupFor("4-4-2", players);

    expect(() => deriveLineRatings(players, { ...lineup, formation: "3-5-2" }, {})).toThrow(
      RangeError,
    );
    expect(() =>
      deriveLineRatings(
        players,
        { ...lineup, starters: ["nobody", ...lineup.starters.slice(1)] },
        {},
      ),
    ).toThrow(RangeError);
  });
});

describe("deriveClubLineRatings", () => {
  it("rates only the players of the club", () => {
    const own = aFullSquad(10);
    const stronger = aFullSquad(20, "other");
    const club = aClub().withPlayerIds(idsOf(own)).build();

    expect(deriveClubLineRatings(club, [...own, ...stronger])).toEqual(
      deriveClubLineRatings(club, own),
    );
  });
});
