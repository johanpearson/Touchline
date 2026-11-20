import type { PerSide } from "../../engine";
import { cn } from "../components/cn";
import { useI18n } from "../i18n-provider";
import { PlayerRatingBadge } from "../player-rating-badge";
import type { LineupRow } from "./lineup-rows";

export type LineupsPanelProps = {
  /** Both sides' rows at the director's clock (`useLineupRows`). */
  rows: PerSide<readonly LineupRow[]>;
  teamNames: PerSide<string>;
  colours: PerSide<string>;
};

const SIDES = ["home", "away"] as const;

function Row({ row }: { row: LineupRow }) {
  const { t, formatNumber } = useI18n();
  return (
    <li
      data-testid={`lineup-row-${row.id}`}
      data-status={row.status}
      data-tired={row.tired ? "true" : undefined}
      className={cn(
        "flex items-center justify-between gap-3 border-b border-line py-1.5 text-[15px] last:border-b-0",
        row.status === "off" && "opacity-60",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-text">{row.name}</span>
        <span className="text-xs text-soft">
          {t(`position.short.${row.position}`)}
          {row.status === "pitch" ? "" : ` · ${t(`match.lineups.status.${row.status}`)}`}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3 text-muted tabular-nums">
        <span>
          {row.goals > 0 ? (
            <>
              <span aria-hidden="true">⚽ {row.goals} · </span>
              <span className="sr-only">
                {t("match.lineups.goals")} {row.goals}.{" "}
              </span>
            </>
          ) : null}
          <span className="sr-only">{t("match.lineups.matchRating")} </span>
          <span data-testid={`match-rating-${row.id}`}>{formatNumber(row.matchRating, 1)}</span>
        </span>
        <PlayerRatingBadge rating={row.rating} fitness={row.energy} layout="inline" />
      </span>
    </li>
  );
}

/**
 * Both squads at the director's clock: the eleven on the pitch, the bench and those substituted off
 * (greyed, last), each with the rating at the position played at the current energy, an energy
 * indicator and the live match rating. Low energy is flagged with a shape and text, not colour alone.
 */
export function LineupsPanel({ rows, teamNames, colours }: LineupsPanelProps) {
  const { t } = useI18n();
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
            {rows[side].map((row) => (
              <Row key={row.id} row={row} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
