import { NEUTRAL_TACTICS, type TeamTactics } from "../engine";
import { MAX_SUBSTITUTIONS } from "./check-substitutions";
import type { Lineup } from "./lineup";
import { liveSquadAfter, type SubstitutionRecord } from "./live-squad";
import type { Player } from "./player";
import {
  effectiveAttributes,
  FITNESS_DRAIN_PER_MATCH,
  FITNESS_MATCH_MINUTES,
  initialCondition,
  type PlayerCondition,
} from "./player-condition";
import { playerOverall } from "./player-overall";
import { checkShout, type ShoutKind, type ShoutRecord, shoutFatigue } from "./shouts";

/** The minute of the AI's half-time window. */
export const AI_HALF_TIME_MINUTE = FITNESS_MATCH_MINUTES / 2;
/** The minutes at which an AI club may change something besides half-time (its three windows). */
export const AI_WINDOW_MINUTES: readonly number[] = [60, 70, 80];
/** An AI club substitutes a starter whose fitness has fallen to this level or lower. */
export const AI_TIRED_FITNESS = 65;
/** A substitute must be at least this much fitter than the player he replaces. */
export const AI_FITNESS_MARGIN = 10;
/** Most substitutions an AI club makes in one window. */
export const AI_MAX_SUBSTITUTIONS_PER_WINDOW = 2;
/** AI clubs give shouts from this minute on. */
export const AI_SHOUT_FROM_MINUTE = 60;
/** The tactics every AI club plays with, and the base of its shouts. */
export const AI_TACTICS: TeamTactics = NEUTRAL_TACTICS;

/** What one AI club has changed so far in a match. */
export type AiChanges = {
  substitutions: readonly SubstitutionRecord[];
  shouts: readonly ShoutRecord[];
};

export const NO_AI_CHANGES: AiChanges = { substitutions: [], shouts: [] };

export type AiSituation = {
  /** Match minute of the pause. */
  minute: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type AiContext = {
  squad: readonly Player[];
  /** The eleven and the bench the club kicked off with. */
  plan: Lineup;
  condition: Readonly<Record<string, PlayerCondition>>;
  previous: AiChanges;
  situation: AiSituation;
};

export type AiPlan = {
  substitutions: { off: string; on: string }[];
  shout?: ShoutKind;
};

type Candidate = { player: Player; fitness: number; strength: number };

const byId = (a: Candidate, b: Candidate): number => (a.player.id < b.player.id ? -1 : 1);

/** Fitness at `minute`: the kickoff fitness less the drain of the minutes played so far and any shouts. */
const fitnessAt = (
  player: Player,
  condition: AiContext["condition"],
  from: number,
  previous: AiChanges,
  minute: number,
): number => {
  const start = (condition[player.id] ?? initialCondition()).fitness;
  const played = Math.max(0, minute - from);
  const drain =
    (FITNESS_DRAIN_PER_MATCH * played) / FITNESS_MATCH_MINUTES +
    shoutFatigue(AI_TACTICS, previous.shouts, from, minute);
  return Math.max(0, start - drain);
};

const strengthOf = (player: Player, condition: AiContext["condition"]): number =>
  playerOverall({
    ...player,
    ...effectiveAttributes(player, condition[player.id] ?? initialCondition()),
  });

const pickSubstitutions = (ctx: AiContext): AiPlan["substitutions"] => {
  const { squad, plan, condition, previous, situation } = ctx;
  const players = new Map(squad.map((p) => [p.id, p]));
  const live = liveSquadAfter(
    plan,
    previous.substitutions,
    (id) => players.get(id)?.position ?? "MID",
  );
  const room = Math.min(
    AI_MAX_SUBSTITUTIONS_PER_WINDOW,
    MAX_SUBSTITUTIONS - previous.substitutions.length,
  );
  const candidate = (id: string, from: number): Candidate => {
    const player = players.get(id) as Player;
    return {
      player,
      fitness: fitnessAt(player, condition, from, previous, situation.minute),
      strength: strengthOf(player, condition),
    };
  };
  const tired = live.starters
    .map((id) => candidate(id, live.cameOn[id] ?? 0))
    .filter((c) => c.player.position !== "GK" && c.fitness <= AI_TIRED_FITNESS)
    .sort((a, b) => a.fitness - b.fitness || byId(a, b));
  const bench = live.bench.map((id) => candidate(id, situation.minute));
  const used = new Set<string>();
  const substitutions: AiPlan["substitutions"] = [];
  for (const off of tired) {
    if (substitutions.length >= room) break;
    const on = bench
      .filter((b) => b.player.position === off.player.position && !used.has(b.player.id))
      .filter((b) => b.fitness >= off.fitness + AI_FITNESS_MARGIN)
      .sort((a, b) => b.strength - a.strength || byId(a, b))[0];
    if (!on) continue;
    used.add(on.player.id);
    substitutions.push({ off: off.player.id, on: on.player.id });
  }
  return substitutions;
};

const shoutFor = (situation: AiSituation, previous: AiChanges): ShoutKind | undefined => {
  if (situation.minute < AI_SHOUT_FROM_MINUTE) return undefined;
  const lead = situation.goalsFor - situation.goalsAgainst;
  const kind: ShoutKind | undefined = lead < 0 ? "pushUp" : lead > 0 ? "calmDown" : undefined;
  if (!kind || checkShout(AI_TACTICS, previous.shouts, kind, situation.minute)) return undefined;
  return kind;
};

/**
 * What an AI club changes at a pause (half-time or one of its windows): it replaces its most tired
 * starters (outfield players whose fitness has fallen to `AI_TIRED_FITNESS` or lower) by the strongest
 * bench player of the same position who is clearly fitter, at most two per window and five in a match,
 * and from minute 60 shouts "Push up" when behind and "Calm it down" when ahead, within the shout
 * duration and cooldown. It reads only the match situation, so it uses no randomness.
 */
export const planAiChange = (ctx: AiContext): AiPlan => {
  const shout = shoutFor(ctx.situation, ctx.previous);
  return { substitutions: pickSubstitutions(ctx), ...(shout ? { shout } : {}) };
};
