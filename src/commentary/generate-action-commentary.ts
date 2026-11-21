import type { ActionEvent, PerSide, Side } from "../engine";
import { computeActionStats, createRng } from "../engine";
import type { Locale } from "../i18n";
import { EVEN_SPELL_MARGIN, SUMMARY_INTERVAL, SUMMARY_SLOTS } from "./action-selection";
import type { CommentaryLine } from "./commentary-line";
import type { ActionPiece, Params } from "./describe-action";
import { describeAction } from "./describe-action";
import { possessive } from "./grammar";
import { selectKeyActions } from "./phase-selection";
import type { ActionTemplateKey } from "./templates/action-templates";
import { actionTemplates } from "./templates/action-templates";

/** Everything the action commentary needs to know besides the events. */
export type ActionCommentaryContext = {
  locale: Locale;
  names: PerSide<string>;
  /** Display name of each player id in the log. An unknown id is shown as it is. */
  players: Readonly<Record<string, string>>;
};

const other = (side: Side): Side => (side === "home" ? "away" : "home");

const render = (text: string, params: Params): string =>
  text.replace(/\{(\w+)\}/g, (placeholder, name: string) => String(params[name] ?? placeholder));

/**
 * Turns an action-engine event log into commentary lines, in time order. Pure: it reads the events
 * and nothing else, and draws all its randomness from its own stream (`createRng(seed).fork("commentary")`),
 * so it can never change the simulation. A line depends only on the events up to and including the
 * one it belongs to, so regenerating from a growing log keeps earlier lines unchanged. Which
 * actions get a line is decided per possession phase (`phase-selection.ts`); set pieces are described one by one.
 */
export const generateActionCommentary = (
  events: readonly ActionEvent[],
  context: ActionCommentaryContext,
  seed: number,
): CommentaryLine[] => {
  const rng = createRng(seed).fork("commentary");
  const { locale, names, players } = context;
  const score: PerSide<number> = { home: 0, away: 0 };
  const lines: CommentaryLine[] = [];
  const keyActions = selectKeyActions(events);
  let nextSlot = 0;

  const nameOf = (id: string | undefined): string => (id === undefined ? "" : (players[id] ?? id));

  const emit = (time: number, piece: ActionPiece) => {
    const side = piece.team ?? "home";
    const opponent = names[other(side)];
    const params: Params = {
      team: names[side],
      opponent,
      opponentGen: possessive(locale, opponent),
      score: `${score.home}–${score.away}`,
      ...piece.params,
    };
    const text = render(rng.pick(actionTemplates[locale][piece.key]), params);
    lines.push({
      time,
      kind: piece.kind,
      team: piece.team,
      importance: piece.big ? "big" : "normal",
      text,
    });
  };

  const neutral = (key: ActionTemplateKey, kind: CommentaryLine["kind"], big = false) =>
    ({ key, kind, team: undefined, big, params: {} }) satisfies ActionPiece;

  const summarise = (end: number) => {
    const start = end - SUMMARY_INTERVAL;
    const before = events.filter((e) => e.time <= start).at(-1);
    const inside = events.filter((e) => e.time > start && e.time <= end);
    const window = before ? [{ ...before, time: start }, ...inside] : inside;
    const share = computeActionStats(window, end).teams.possession.home;
    const homePct = Math.round(share * 100);
    if (Math.abs(share - 0.5) < EVEN_SPELL_MARGIN) {
      emit(end, {
        key: "summaryEven",
        kind: "summary",
        team: undefined,
        params: { a: homePct, b: 100 - homePct },
      });
      return;
    }
    const team: Side = share > 0.5 ? "home" : "away";
    emit(end, {
      key: "summaryDominant",
      kind: "summary",
      team,
      params: { pct: team === "home" ? homePct : 100 - homePct },
    });
  };

  const summariesDueBy = (time: number) => {
    while (nextSlot < SUMMARY_SLOTS.length && (SUMMARY_SLOTS[nextSlot] as number) <= time) {
      summarise(SUMMARY_SLOTS[nextSlot] as number);
      nextSlot += 1;
    }
  };

  events.forEach((event, index) => {
    summariesDueBy(event.time);
    if (event.type === "periodChange") {
      if (event.period === "halfTime") emit(event.time, neutral("halfTime", "halfTime"));
      if (event.period === "fullTime") emit(event.time, neutral("fullTime", "fullTime", true));
      return;
    }
    if (event.type === "shot" && event.outcome === "goal") score[event.team] += 1;
    if (event.type !== "setPiece" && !keyActions.has(index)) return;
    for (const piece of describeAction(event, events[index - 1], { locale, nameOf, rng })) {
      emit(event.time, piece);
    }
  });

  return lines;
};
