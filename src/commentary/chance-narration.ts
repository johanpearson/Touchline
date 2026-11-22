import type { ActionShotEvent, ChanceKind, ChanceResult, StepChance } from "../engine";
import type { ActionPiece, DescribeContext, Params } from "./action-piece";
import { possessive } from "./grammar";
import type { ActionTemplateKey } from "./templates/action-templates";

const BUILD_UP: Record<Exclude<ChanceKind, "penalty">, ActionTemplateKey> = {
  openPlay: "buildUpOpenPlay",
  throughBall: "buildUpThroughBall",
  cross: "buildUpCross",
  cutBack: "buildUpCutBack",
  counter: "buildUpCounter",
  setPiece: "buildUpSetPiece",
  freeKick: "buildUpFreeKick",
};

const REACTION: Record<Exclude<ChanceResult, "goal">, ActionTemplateKey> = {
  saved: "reactionSaved",
  woodwork: "reactionWoodwork",
  blocked: "reactionBlocked",
  wide: "reactionWide",
  over: "reactionOver",
};

/** A clear chance that the narration covers with a build-up and a reaction line; a penalty keeps its own lines. */
export const isNarrated = (chance: StepChance | undefined): chance is StepChance =>
  chance?.clear === true && chance.kind !== "penalty";

const named = (ctx: DescribeContext, role: string, id: string): Params => {
  const name = ctx.nameOf(id);
  return { [role]: name, [`${role}Gen`]: possessive(ctx.locale, name) };
};

/**
 * The lines of a clear chance (#464): one while it builds, which names its creator and kind, and one
 * reaction that fits the result (the goal, a save, the post, a block, a miss wide or over). The two
 * share the shot's time; every clear chance gets both, so a chance never goes unnoticed.
 */
export const chancePieces = (
  event: ActionShotEvent,
  chance: StepChance,
  ctx: DescribeContext,
): ActionPiece[] => {
  const params = {
    ...named(ctx, "player", chance.shooter),
    ...named(ctx, "keeper", chance.keeper),
    ...named(ctx, "creator", chance.creator),
  };
  const buildUp: ActionPiece = {
    key: BUILD_UP[chance.kind as Exclude<ChanceKind, "penalty">],
    kind: "chance",
    team: event.team,
    params,
  };
  if (chance.result === "goal") {
    const key = chance.creator === chance.shooter ? "goal" : "goalAssist";
    const passer = named(ctx, "passer", chance.creator);
    return [
      buildUp,
      { key, kind: "goal", team: event.team, big: true, params: { ...params, ...passer } },
    ];
  }
  return [
    buildUp,
    { key: REACTION[chance.result], kind: "chance", team: event.team, big: true, params },
  ];
};
