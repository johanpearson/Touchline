import type { ActionEvent, ActionShotEvent, PassEvent, Rng, Side } from "../engine";
import { PITCH_LENGTH } from "../engine";
import type { Locale } from "../i18n";
import {
  BIG_CHANCE_XG,
  COLOUR_CHANCE,
  DANGER_PROGRESS,
  DANGEROUS_FREE_KICK_CHANCE,
  DANGEROUS_STOP_CHANCE,
  FOUL_CHANCE,
  FREE_KICK_CHANCE,
  KEY_PASS_CHANCE,
  MINOR_SHOT_CHANCE,
  MINOR_SHOT_XG,
  THROUGH_BALL_CHANCE,
} from "./action-selection";
import type { CommentaryKind } from "./commentary-line";
import { possessive } from "./grammar";
import type { ActionTemplateKey } from "./templates/action-templates";

export type Params = Record<string, string | number>;

/** One line to emit: which template, what it is about and the names to fill in. */
export type ActionPiece = {
  key: ActionTemplateKey;
  kind: CommentaryKind;
  team: Side | undefined;
  big?: boolean;
  /** Placeholders beyond the team names and the score. */
  params: Params;
};

export type DescribeContext = {
  locale: Locale;
  /** Display name of a player id (the id itself when unknown). */
  nameOf: (id: string | undefined) => string;
  rng: Rng;
};

const other = (side: Side): Side => (side === "home" ? "away" : "home");

/** How far `x` (metres) is towards the opponent's goal for `side`, 0 to 1. */
const attackProgress = (side: Side, x: number): number => {
  const share = x / PITCH_LENGTH;
  return side === "home" ? share : 1 - share;
};

const isDangerous = (side: Side, x: number): boolean => attackProgress(side, x) > DANGER_PROGRESS;

const named = (ctx: DescribeContext, role: string, id: string | undefined): Params => {
  const name = ctx.nameOf(id);
  return { [role]: name, [`${role}Gen`]: possessive(ctx.locale, name) };
};

const isKeyPass = (
  previous: ActionEvent | undefined,
  shot: ActionShotEvent,
): previous is PassEvent =>
  previous !== undefined &&
  previous.type === "pass" &&
  previous.outcome === "complete" &&
  previous.team === shot.team &&
  previous.target === shot.actor;

const penaltyShot = (event: ActionShotEvent, ctx: DescribeContext): ActionPiece => {
  const params = { ...named(ctx, "player", event.actor), ...named(ctx, "keeper", event.opponent) };
  const base = { kind: "penalty" as const, team: event.team, big: true, params };
  if (event.outcome === "goal") return { ...base, key: "penaltyGoal" };
  return { ...base, key: event.outcome === "saved" ? "penaltySaved" : "penaltyMissed" };
};

const shotKey = (event: ActionShotEvent, big: boolean): ActionTemplateKey => {
  if (event.outcome === "saved") return big ? "bigSave" : "save";
  if (event.outcome === "blocked") return "blocked";
  if (event.outcome === "woodwork") return "woodwork";
  return big ? "bigMiss" : "wide";
};

const shotPieces = (
  event: ActionShotEvent,
  previous: ActionEvent | undefined,
  ctx: DescribeContext,
): ActionPiece[] => {
  const afterPenalty = previous?.type === "setPiece" && previous.variant === "penalty";
  if (afterPenalty) return [penaltyShot(event, ctx)];
  const key: Params = isKeyPass(previous, event) ? named(ctx, "passer", previous.actor) : {};
  const params = {
    ...named(ctx, "player", event.actor),
    ...named(ctx, "keeper", event.opponent),
    ...key,
  };
  if (event.outcome === "goal") {
    const hasPasser = Object.keys(key).length > 0;
    return [
      {
        key: hasPasser ? "goalAssist" : "goal",
        kind: "goal",
        team: event.team,
        big: true,
        params,
      },
    ];
  }
  const big = event.xg >= BIG_CHANCE_XG;
  const minor = event.xg < MINOR_SHOT_XG && event.outcome !== "woodwork";
  if (!big && (minor || !ctx.rng.chance(MINOR_SHOT_CHANCE))) return [];
  const pieces: ActionPiece[] = [];
  if (Object.keys(key).length > 0 && ctx.rng.chance(KEY_PASS_CHANCE)) {
    pieces.push({ key: "keyPass", kind: "keyPass", team: event.team, params });
  }
  pieces.push({ key: shotKey(event, big), kind: "chance", team: event.team, big, params });
  return pieces;
};

const stopPiece = (
  event: ActionEvent & { type: "tackle" | "interception" },
  ctx: DescribeContext,
): ActionPiece[] => {
  if (event.outcome !== "won") return [];
  const attackerDanger = isDangerous(other(event.team), event.from.x);
  if (!attackerDanger || !ctx.rng.chance(DANGEROUS_STOP_CHANCE)) return [];
  const params = {
    ...named(ctx, "player", event.actor),
    ...(event.opponent === undefined ? {} : { opponentPlayer: ctx.nameOf(event.opponent) }),
  };
  const isTackle = event.type === "tackle";
  return [
    {
      key: isTackle && event.opponent !== undefined ? "tackleStop" : "interceptionStop",
      kind: "tackle",
      team: event.team,
      params,
    },
  ];
};

const foulPieces = (event: ActionEvent & { type: "foul" }, ctx: DescribeContext): ActionPiece[] => {
  const penalty = event.outcome === "penalty";
  if (!penalty && !ctx.rng.chance(FOUL_CHANCE)) return [];
  const params = {
    ...named(ctx, "player", event.actor),
    ...named(ctx, "offender", event.opponent),
  };
  return [
    {
      key: penalty ? "penaltyAwarded" : "foul",
      kind: penalty ? "penalty" : "foul",
      team: event.team,
      big: penalty,
      params,
    },
  ];
};

const setPiecePieces = (
  event: ActionEvent & { type: "setPiece" },
  previous: ActionEvent | undefined,
  ctx: DescribeContext,
): ActionPiece[] => {
  const params = named(ctx, "player", event.actor);
  const piece = (key: ActionTemplateKey, kind: CommentaryKind): ActionPiece[] => [
    { key, kind, team: event.team, params },
  ];
  switch (event.variant) {
    case "kickoff": {
      if (!previous) return piece("kickoff", "kickoff");
      const secondHalf = previous.type === "periodChange" && previous.period === "secondHalf";
      return secondHalf ? piece("secondHalfKickoff", "kickoff") : [];
    }
    case "corner":
      return piece("corner", "setPiece");
    case "freeKick": {
      const chance = isDangerous(event.team, event.from.x)
        ? DANGEROUS_FREE_KICK_CHANCE
        : FREE_KICK_CHANCE;
      return ctx.rng.chance(chance) ? piece("freeKick", "setPiece") : [];
    }
    case "throwIn":
      return ctx.rng.chance(COLOUR_CHANCE) ? piece("throwIn", "setPiece") : [];
    case "goalKick":
      return ctx.rng.chance(COLOUR_CHANCE) ? piece("goalKick", "setPiece") : [];
    default:
      return [];
  }
};

const throughBallPieces = (event: PassEvent, ctx: DescribeContext): ActionPiece[] => {
  if (event.variant !== "through" || event.outcome !== "complete") return [];
  if (!isDangerous(event.team, event.to.x) || !ctx.rng.chance(THROUGH_BALL_CHANCE)) return [];
  const params = { ...named(ctx, "passer", event.actor), ...named(ctx, "player", event.target) };
  const piece: ActionPiece = { key: "throughBall", kind: "keyPass", team: event.team, params };
  return [piece];
};

/**
 * The commentary pieces for one action event, in the order they should appear. Depends only on the
 * event, the one before it and the stream position, so lines never depend on later events.
 * Half-time, full time and summaries are handled by the generator.
 */
export const describeAction = (
  event: ActionEvent,
  previous: ActionEvent | undefined,
  ctx: DescribeContext,
): ActionPiece[] => {
  switch (event.type) {
    case "shot":
      return shotPieces(event, previous, ctx);
    case "tackle":
    case "interception":
      return stopPiece(event, ctx);
    case "foul":
      return foulPieces(event, ctx);
    case "setPiece":
      return setPiecePieces(event, previous, ctx);
    case "pass":
      return throughBallPieces(event, ctx);
    default:
      return [];
  }
};
