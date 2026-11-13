import type { MatchEvent, PerSide, Side } from "../engine";
import { computeMatchStats, createRng } from "../engine";
import type { Locale } from "../i18n";
import type { CommentaryKind, CommentaryLine } from "./commentary-line";
import { possessive } from "./grammar";
import type { TemplateKey } from "./templates/templates";
import { templates } from "./templates/templates";

/** Everything the commentary needs to know besides the events. */
export type CommentaryContext = {
  locale: Locale;
  names: PerSide<string>;
  /** Scorer of each goal, in goal order (see `attributeGoalScorers` in `src/game`). Players are only ever named on goals. */
  scorers: readonly string[];
};

const SUMMARY_INTERVAL = 900;
/** Summary times in match seconds: every 15 minutes, except where a half ends. */
const SUMMARY_SLOTS = [1, 2, 4, 5].map((n) => n * SUMMARY_INTERVAL);
const EVEN_SPELL_MARGIN = 0.08;
const MINOR_SHOT_XG = 0.045;
const BIG_CHANCE_XG = 0.12;
const DANGER_PROGRESS = 0.8;
const DANGER_CHANCE = 0.3;
const HIGH_TURNOVER_PROGRESS = 0.65;
const HIGH_TURNOVER_CHANCE = 0.15;
const FOUL_CHANCE = 0.4;

const other = (side: Side): Side => (side === "home" ? "away" : "home");
const attackProgress = (side: Side, x: number): number => (side === "home" ? x : 1 - x);

type Params = Record<string, string | number>;
type Piece = { key: TemplateKey; kind: CommentaryKind; team: Side | undefined; big?: boolean };

const render = (text: string, params: Params): string =>
  text.replace(/\{(\w+)\}/g, (placeholder, name: string) => String(params[name] ?? placeholder));

const shotPiece = (event: MatchEvent & { type: "shot" }): Piece | undefined => {
  if (event.outcome === "goal" || event.xg < MINOR_SHOT_XG) return undefined;
  const big = event.xg > BIG_CHANCE_XG;
  const team = event.team;
  if (event.outcome === "saved") return { key: big ? "bigSave" : "save", kind: "chance", team };
  if (event.outcome === "blocked") return { key: "blocked", kind: "chance", team };
  return { key: big ? "bigMiss" : "wide", kind: "chance", team };
};

/**
 * Turns the event log into commentary lines, in time order. Pure: it reads the events and nothing
 * else, and draws all its randomness from its own stream (forked from `seed`), so it can never
 * change the simulation. Lines for a stretch of the match do not depend on what happens later,
 * so the feed can be regenerated from a growing log and stay stable.
 */
export const generateCommentary = (
  events: readonly MatchEvent[],
  context: CommentaryContext,
  seed: number,
): CommentaryLine[] => {
  const rng = createRng(seed).fork("commentary");
  const { locale, names, scorers } = context;
  const score: PerSide<number> = { home: 0, away: 0 };
  const lines: CommentaryLine[] = [];
  let nextSlot = 0;
  let goalIndex = 0;

  const scoreText = () => `${score.home}–${score.away}`;
  const paramsFor = (team: Side | undefined, extra: Params = {}): Params => {
    const side = team ?? "home";
    const opponent = names[other(side)];
    return {
      team: names[side],
      opponent,
      opponentGen: possessive(locale, opponent),
      score: scoreText(),
      ...extra,
    };
  };
  const scorerOf = (team: Side): string => scorers[goalIndex++] ?? names[team];
  const emit = (time: number, piece: Piece, extra: Params = {}) => {
    const text = render(rng.pick(templates[locale][piece.key]), paramsFor(piece.team, extra));
    lines.push({
      time,
      kind: piece.kind,
      team: piece.team,
      importance: piece.big ? "big" : "normal",
      text,
    });
  };

  const summarise = (end: number, upTo: number) => {
    const start = end - SUMMARY_INTERVAL;
    const before = events.filter((e) => e.time <= start).at(-1);
    const inside = events.filter((e) => e.time > start && e.time <= upTo);
    const window = before ? [{ ...before, time: start }, ...inside] : inside;
    const share = computeMatchStats(window, end).possession.home;
    const homePct = Math.round(share * 100);
    if (Math.abs(share - 0.5) < EVEN_SPELL_MARGIN) {
      emit(
        end,
        { key: "summaryEven", kind: "summary", team: undefined },
        { a: homePct, b: 100 - homePct },
      );
      return;
    }
    const team: Side = share > 0.5 ? "home" : "away";
    emit(
      end,
      { key: "summaryDominant", kind: "summary", team },
      { pct: team === "home" ? homePct : 100 - homePct },
    );
  };

  const summariesDueBy = (time: number) => {
    while (nextSlot < SUMMARY_SLOTS.length && (SUMMARY_SLOTS[nextSlot] as number) <= time) {
      summarise(SUMMARY_SLOTS[nextSlot] as number, time);
      nextSlot += 1;
    }
  };

  const pieceFor = (event: MatchEvent, index: number): Piece | undefined => {
    switch (event.type) {
      case "kickoff":
        return index === 0
          ? { key: "kickoff", kind: "kickoff", team: event.team }
          : { key: "secondHalfKickoff", kind: "kickoff", team: event.team };
      case "goal":
        return { key: "goal", kind: "goal", team: event.team, big: true };
      case "shot":
        return shotPiece(event);
      case "corner":
        return { key: "corner", kind: "corner", team: event.team };
      case "foul":
        return rng.chance(FOUL_CHANCE)
          ? { key: "foul", kind: "foul", team: event.team }
          : undefined;
      case "progress":
        return attackProgress(event.team, event.position.x) > DANGER_PROGRESS &&
          rng.chance(DANGER_CHANCE)
          ? { key: "danger", kind: "danger", team: event.team }
          : undefined;
      case "turnover":
        return attackProgress(event.team, event.position.x) > HIGH_TURNOVER_PROGRESS &&
          rng.chance(HIGH_TURNOVER_CHANCE)
          ? { key: "turnoverHigh", kind: "turnover", team: event.team }
          : undefined;
      default:
        return undefined;
    }
  };

  events.forEach((event, index) => {
    summariesDueBy(event.time);
    if (event.type === "periodChange") {
      if (event.period === "halfTime") {
        emit(event.time, { key: "halfTime", kind: "halfTime", team: undefined });
      } else if (event.period === "fullTime") {
        emit(event.time, { key: "fullTime", kind: "fullTime", team: undefined, big: true });
      }
      return;
    }
    if (event.type === "goal") score[event.team] += 1;
    const piece = pieceFor(event, index);
    if (!piece) return;
    emit(event.time, piece, event.type === "goal" ? { player: scorerOf(event.team) } : {});
  });

  return lines;
};
