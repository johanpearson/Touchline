import { useMemo } from "react";
import type { ActionEvent, PerSide, Side } from "../../engine";
import { computeActionStats, playerRatings } from "../../engine";
import { useI18n } from "../i18n-provider";
import { buildRatingRows } from "./ratings-table";

export type LineupsPanelProps = {
  events: readonly ActionEvent[];
  /** Number of events, because `events` is appended to in place. */
  eventCount: number;
  matchTime: number;
  /** Ids of the players who played, per side: starters first, then those brought on. */
  played: PerSide<readonly string[]>;
  names: Readonly<Record<string, string>>;
  teamNames: PerSide<string>;
  colours: PerSide<string>;
  userSide: Side;
};

const SIDES: readonly Side[] = ["home", "away"];

/** Both elevens with their live ratings and goals; mounted only while the user looks at it. */
export function LineupsPanel({
  events,
  eventCount,
  matchTime,
  played,
  names,
  teamNames,
  colours,
  userSide,
}: LineupsPanelProps) {
  const { t, formatNumber } = useI18n();
  // biome-ignore lint/correctness/useExhaustiveDependencies: `events` grows in place; `eventCount` says when
  const rows = useMemo(
    () =>
      buildRatingRows({
        players: computeActionStats(events, matchTime).players,
        ratings: playerRatings(
          events,
          [...played.home, ...played.away].map((id) => ({ id })),
        ),
        played,
        names,
        userSide,
      }),
    [eventCount, matchTime, played, names, userSide],
  );
  return (
    <div className="flex flex-col gap-4" data-testid="lineups-panel">
      {SIDES.map((side) => (
        <section key={side} aria-label={t("match.lineups.side", { team: teamNames[side] })}>
          <h3 className="m-0 mb-1 flex items-center gap-2 font-heading text-base font-semibold">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full"
              style={{ background: colours[side] }}
            />
            <span className="min-w-0 truncate" title={teamNames[side]}>
              {teamNames[side]}
            </span>
          </h3>
          <ul className="m-0 flex list-none flex-col p-0" data-testid={`lineup-${side}`}>
            {rows
              .filter((row) => row.side === side)
              .map((row) => (
                <li
                  key={row.id}
                  data-testid={`lineup-row-${row.id}`}
                  className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-[15px] last:border-b-0"
                >
                  <span className="min-w-0 truncate text-text">{row.name}</span>
                  <span className="shrink-0 text-muted tabular-nums">
                    {row.goals > 0 ? `⚽ ${row.goals} · ` : ""}
                    {formatNumber(row.rating, 1)}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
