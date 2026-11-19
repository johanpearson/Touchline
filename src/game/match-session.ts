import type {
  ActionMatchChange,
  EngineVersion,
  MatchInput,
  Period,
  TimedActionMatchChange,
} from "../engine";
import type { Career } from "./career";
import type { Fixture } from "./generate-fixtures";
import { isInt, isNonNegativeNumber, isRecord, isString, type Rec } from "./json-guards";
import { matchInputFor, matchSeed } from "./match-input-for";
import type { SquadPlan } from "./squad-plan";

/** The version of the stored match session. Every later change to its shape bumps this. */
export const MATCH_SESSION_VERSION = 1;

/** How the match view paces the match; the same names as the playback director's modes. */
export type MatchSessionMode = "highlights" | "extended" | "full";

const MODES: readonly string[] = ["highlights", "extended", "full"];
const PERIODS: readonly string[] = ["firstHalf", "halfTime", "secondHalf", "fullTime"];

/**
 * A match in progress as plain versioned JSON. The match is fully reproducible from the career, the
 * seed, the squad plan the user kicked off with and the changes the user made, so nothing else is
 * stored: `resumeMatch` replays it to `position`. It is never part of a save or an exported save file.
 */
export type MatchSession = {
  schemaVersion: typeof MATCH_SESSION_VERSION;
  /** The career the match belongs to: its seed and the user's club. */
  careerSeed: number;
  userClubId: string;
  season: number;
  fixtureId: string;
  engineVersion: EngineVersion;
  seed: number;
  /** The user's plan at kickoff; the loaded career may still hold an older one. */
  squadPlan: SquadPlan;
  /** Fingerprint of the match input with `squadPlan`; a different one means the squads changed. */
  inputKey: string;
  /** The user's changes with the engine time they were applied at; the AI's are made by the coach. */
  changes: TimedActionMatchChange[];
  mode: MatchSessionMode;
  /** What the user saw: the match time at the director's clock and the period then. */
  position: { matchTime: number; period: Period };
};

/** Why a stored session is not used. */
export type MatchSessionIssue =
  | "other-career"
  | "other-fixture"
  | "engine-version"
  | "squad-changed";

/** 32-bit FNV-1a of the JSON of `value`, in hex. Enough to notice a changed squad, not a security hash. */
export const fingerprintOf = (value: unknown): string => {
  let hash = 0x811c9dc5;
  for (const char of JSON.stringify(value)) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

/** The career with the plan the match was kicked off with. */
export const careerOfSession = (career: Career, session: MatchSession): Career => ({
  ...career,
  squadPlan: session.squadPlan,
});

/** The fingerprint to store for a match input. */
export const inputKeyOf = (input: MatchInput): string => fingerprintOf(input);

/** The fields of a new session that do not change during the match. */
export type MatchSessionIdentity = Pick<
  MatchSession,
  | "schemaVersion"
  | "careerSeed"
  | "userClubId"
  | "season"
  | "fixtureId"
  | "engineVersion"
  | "seed"
  | "squadPlan"
  | "inputKey"
>;

/** What identifies the match of `fixture` kicked off with the career's current plan. */
export const identityOf = (career: Career, fixture: Fixture): MatchSessionIdentity => {
  const input = matchInputFor(career, fixture);
  return {
    schemaVersion: MATCH_SESSION_VERSION,
    careerSeed: career.seed,
    userClubId: career.userClubId,
    season: career.season.number,
    fixtureId: fixture.id,
    engineVersion: input.engineVersion,
    seed: matchSeed(career, fixture),
    squadPlan: career.squadPlan,
    inputKey: inputKeyOf(input),
  };
};

/** Whether the session is a match of this career's season; the cheap check the header and nav use. */
export const isSessionOfCareer = (session: MatchSession, career: Career): boolean =>
  session.careerSeed === career.seed &&
  session.userClubId === career.userClubId &&
  session.season === career.season.number;

/** Why the session cannot be resumed as the match of `fixture` in `career`, or null when it can. */
export const sessionIssue = (
  session: MatchSession,
  career: Career,
  fixture: Fixture,
): MatchSessionIssue | null => {
  if (session.careerSeed !== career.seed || session.userClubId !== career.userClubId) {
    return "other-career";
  }
  if (session.season !== career.season.number || session.fixtureId !== fixture.id) {
    return "other-fixture";
  }
  const now = identityOf(careerOfSession(career, session), fixture);
  if (session.engineVersion !== now.engineVersion) return "engine-version";
  if (session.seed !== now.seed || session.inputKey !== now.inputKey) return "squad-changed";
  return null;
};

export type MatchSessionError = "unknown-version" | "corrupt";

export type ParseMatchSessionResult =
  | { ok: true; session: MatchSession }
  | { ok: false; error: MatchSessionError };

const isChange = (value: unknown): value is ActionMatchChange =>
  isRecord(value) &&
  (value.side === "home" || value.side === "away") &&
  (value.lineup === undefined || Array.isArray(value.lineup)) &&
  (value.tactics === undefined || isRecord(value.tactics));

const isTimedChange = (value: unknown): value is TimedActionMatchChange =>
  isRecord(value) && isNonNegativeNumber(value.time) && isChange(value.change);

const isPosition = (value: unknown): value is MatchSession["position"] =>
  isRecord(value) &&
  isNonNegativeNumber(value.matchTime) &&
  isString(value.period) &&
  PERIODS.includes(value.period);

const hasShape = (value: Rec): boolean =>
  isInt(value.careerSeed) &&
  isString(value.userClubId) &&
  isInt(value.season) &&
  isString(value.fixtureId) &&
  (value.engineVersion === 1 || value.engineVersion === 2) &&
  isInt(value.seed) &&
  isRecord(value.squadPlan) &&
  isString(value.inputKey) &&
  Array.isArray(value.changes) &&
  value.changes.every(isTimedChange) &&
  isString(value.mode) &&
  MODES.includes(value.mode) &&
  isPosition(value.position);

/** Reads a stored session. A different version or a damaged shape is refused, never thrown. */
export const parseMatchSession = (value: unknown): ParseMatchSessionResult => {
  if (!isRecord(value) || !isInt(value.schemaVersion)) return { ok: false, error: "corrupt" };
  if (value.schemaVersion !== MATCH_SESSION_VERSION) return { ok: false, error: "unknown-version" };
  if (!hasShape(value)) return { ok: false, error: "corrupt" };
  return { ok: true, session: value as unknown as MatchSession };
};
