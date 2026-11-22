import type { PerSide } from "../../engine";
import type { MessageKey } from "../../i18n";
import { useI18n } from "../i18n-provider";
import { useReducedMotion } from "../motion/use-reduced-motion";
import type { SegmentChance } from "./director";

export type ChanceCueProps = {
  /** The chance moment at the director's clock; nothing is shown without one. */
  moment: SegmentChance | undefined;
  teamNames: PerSide<string>;
  colours: PerSide<string>;
  /** Player names by id. */
  players: Readonly<Record<string, string>>;
};

const RESULT_KEYS = {
  goal: "match.chance.goal",
  saved: "match.chance.saved",
  woodwork: "match.chance.woodwork",
  blocked: "match.chance.blocked",
  wide: "match.chance.wide",
  over: "match.chance.over",
} as const satisfies Record<SegmentChance["result"], MessageKey>;

/** The message key of a stage: the build-up, the shot, then the reaction to the result. */
export const chanceCueKey = (moment: SegmentChance): MessageKey => {
  if (moment.stage === "creator") return "match.chance.building";
  if (moment.stage === "reaction") return RESULT_KEYS[moment.result];
  return "match.chance.shot";
};

/**
 * Over the stage while a clear chance plays: a line that names the side, the taker and (after a save)
 * the keeper, with the side's colour as a bar. The text carries the meaning, colour and motion only
 * help; with `prefers-reduced-motion` the bar does not pulse. A polite live region, so a screen
 * reader hears the same story.
 */
export function ChanceCue({ moment, teamNames, colours, players }: ChanceCueProps) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const params = moment && {
    team: teamNames[moment.team],
    player: players[moment.shooter] ?? "",
    keeper: players[moment.keeper] ?? "",
  };
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3"
      role="status"
      aria-live="polite"
      data-testid="chance-cue-region"
    >
      {moment && params && (
        <p
          className={`rounded-md border border-line bg-stage/90 px-3 py-1.5 text-sm font-semibold text-white shadow-lg ${
            reduced || moment.stage === "reaction" ? "" : "animate-pulse"
          }`}
          style={{ borderLeft: `4px solid ${colours[moment.team]}` }}
          data-testid="chance-cue"
          data-stage={moment.stage}
          data-result={moment.result}
        >
          {t(chanceCueKey(moment), params)}
        </p>
      )}
    </div>
  );
}
