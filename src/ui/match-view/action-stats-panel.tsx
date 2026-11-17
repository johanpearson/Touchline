import type { ActionStats, PerSide } from "../../engine";
import { useI18n } from "../i18n-provider";

type RowId =
  | "possession"
  | "shots"
  | "shotsOnTarget"
  | "xg"
  | "corners"
  | "fouls"
  | "passes"
  | "passCompletion"
  | "keyPasses";

export type ActionStatsPanelProps = {
  stats: ActionStats;
  /** Ids of the players of each side, to total their key passes. */
  playerIds: PerSide<readonly string[]>;
  /** The kit colours worn, for the bars. Without them the bars use the text colour. */
  colours?: PerSide<string>;
};

const keyPassesOf = (stats: ActionStats, ids: readonly string[]): number =>
  ids.reduce((sum, id) => sum + (stats.players[id]?.keyPasses ?? 0), 0);

/** The share of the row that belongs to the home side, for the bars. */
const homeShare = (values: PerSide<number>): number => {
  const total = values.home + values.away;
  return total > 0 ? values.home / total : 0.5;
};

/** The action engine's stats: possession, shots, on target, xG, corners, fouls, passes, completion, key passes. */
export function ActionStatsPanel({ stats, playerIds, colours }: ActionStatsPanelProps) {
  const { t, formatPercent, formatNumber } = useI18n();
  const { teams } = stats;
  const count = (n: number) => String(n);
  const keyPasses = {
    home: keyPassesOf(stats, playerIds.home),
    away: keyPassesOf(stats, playerIds.away),
  };
  const rows: { id: RowId; raw: PerSide<number>; format: (n: number) => string }[] = [
    { id: "possession", raw: teams.possession, format: formatPercent },
    { id: "shots", raw: teams.shots, format: count },
    { id: "shotsOnTarget", raw: teams.shotsOnTarget, format: count },
    { id: "xg", raw: teams.xg, format: (n) => formatNumber(n, 2) },
    { id: "corners", raw: teams.corners, format: count },
    { id: "fouls", raw: teams.fouls, format: count },
    { id: "passes", raw: teams.passes, format: count },
    { id: "passCompletion", raw: teams.passCompletion, format: formatPercent },
    { id: "keyPasses", raw: keyPasses, format: count },
  ];
  return (
    <section aria-labelledby="stats-title" data-testid="stats-panel">
      <h2 id="stats-title" className="m-0 mb-3 font-heading text-lg font-semibold">
        {t("stats.title")}
      </h2>
      <dl className="m-0 flex flex-col gap-3">
        {rows.map(({ id, raw, format }) => (
          <div
            key={id}
            data-testid={`stat-${id}`}
            className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-baseline gap-x-2 gap-y-1 text-[13px] tabular-nums"
          >
            {/* A term comes first in a definition-list group; the grid places the cells side by side. */}
            <dt className="col-start-2 row-start-1 text-center text-muted">
              {t(`stats.label.${id}`)}
            </dt>
            <dd
              data-side="home"
              className="col-start-1 row-start-1 m-0 text-left text-base font-semibold text-text"
            >
              {format(raw.home)}
            </dd>
            <dd
              data-side="away"
              className="col-start-3 row-start-1 m-0 text-right text-base font-semibold text-text"
            >
              {format(raw.away)}
            </dd>
            <dd
              aria-hidden="true"
              className="col-span-3 row-start-2 m-0 flex h-1.5 overflow-hidden rounded-full bg-track"
            >
              <span
                className="h-full bg-soft"
                style={{
                  width: `${homeShare(raw) * 100}%`,
                  background: colours?.home,
                }}
              />
              <span className="h-full flex-1 bg-muted" style={{ background: colours?.away }} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
