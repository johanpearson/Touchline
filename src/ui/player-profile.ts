import {
  type AttributeName,
  type Career,
  type Club,
  effectiveAttributes,
  initialCondition,
  type Player,
  type PlayerAttributes,
  type PlayerPosition,
  playerOverall,
} from "../game";

export type AttributeBand = "low" | "mid" | "high";
export type AttributeGroupId = "technical" | "physical" | "goalkeeping";
export type AttributeGroup = { id: AttributeGroupId; names: readonly AttributeName[] };
export type ProfileStatus = "starter" | "bench" | "out";

/** Low is 1-7, mid 8-13, high 14-20. The band is always shown as text next to the number. */
export const attributeBand = (value: number): AttributeBand =>
  value <= 7 ? "low" : value <= 13 ? "mid" : "high";

const TECHNICAL: readonly AttributeName[] = [
  "passing",
  "ballControl",
  "dribbling",
  "vision",
  "finishing",
  "tackling",
  "positioning",
];
const PHYSICAL: readonly AttributeName[] = ["pace", "workRate", "strength"];
const GOALKEEPING: readonly AttributeName[] = ["handling", "reflexes"];

/** The attributes in display groups; the goalkeeping group is only for keepers. */
export const attributeGroups = (position: PlayerPosition): AttributeGroup[] => {
  const groups: AttributeGroup[] = [
    { id: "technical", names: TECHNICAL },
    { id: "physical", names: PHYSICAL },
  ];
  return position === "GK" ? [...groups, { id: "goalkeeping", names: GOALKEEPING }] : groups;
};

export type PlayerProfile = {
  player: Player;
  club: Club;
  overall: number;
  fitness: number;
  form: number;
  /** Stored attributes scaled by fitness and form; shown apart from the stored ones. */
  effective: PlayerAttributes;
  /** The matchday squad status, only known for the user's own players. */
  status: ProfileStatus | null;
  /** Goals this season, or null when a result of the club has no recorded scorers. */
  goals: number | null;
};

const statusOf = (career: Career, id: string): ProfileStatus =>
  career.squadPlan.starters.includes(id)
    ? "starter"
    : career.squadPlan.bench.includes(id)
      ? "bench"
      : "out";

const goalsOf = (career: Career, club: Club, id: string): number | null => {
  const results = career.season.results.filter(
    (r) => r.homeClubId === club.id || r.awayClubId === club.id,
  );
  if (results.some((r) => r.scorers === undefined)) return null;
  return results.reduce((sum, r) => sum + (r.scorers ?? []).filter((s) => s === id).length, 0);
};

/** Everything the profile screen shows, or null when the player or their club is unknown. */
export const playerProfile = (career: Career, playerId: string): PlayerProfile | null => {
  const player = career.league.players.find((p) => p.id === playerId);
  const club = career.league.clubs.find((c) => c.playerIds.includes(playerId));
  if (!player || !club) return null;
  const condition = career.condition[playerId] ?? initialCondition();
  return {
    player,
    club,
    overall: playerOverall(player),
    fitness: condition.fitness,
    form: condition.form,
    effective: effectiveAttributes(player, condition),
    status: club.id === career.userClubId ? statusOf(career, playerId) : null,
    goals: goalsOf(career, club, playerId),
  };
};
