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
};

const keyPassesOf = (stats: ActionStats, ids: readonly string[]): number =>
  ids.reduce((sum, id) => sum + (stats.players[id]?.keyPasses ?? 0), 0);

/** The action engine's stats: possession, shots, on target, xG, corners, fouls, passes, completion, key passes. */
export function ActionStatsPanel({ stats, playerIds }: ActionStatsPanelProps) {
  const { t, formatPercent, formatNumber } = useI18n();
  const { teams } = stats;
  const pair = (values: PerSide<number>, format: (n: number) => string): PerSide<string> => ({
    home: format(values.home),
    away: format(values.away),
  });
  const count = (n: number) => String(n);
  const rows: { id: RowId; values: PerSide<string> }[] = [
    { id: "possession", values: pair(teams.possession, formatPercent) },
    { id: "shots", values: pair(teams.shots, count) },
    { id: "shotsOnTarget", values: pair(teams.shotsOnTarget, count) },
    { id: "xg", values: pair(teams.xg, (n) => formatNumber(n, 2)) },
    { id: "corners", values: pair(teams.corners, count) },
    { id: "fouls", values: pair(teams.fouls, count) },
    { id: "passes", values: pair(teams.passes, count) },
    { id: "passCompletion", values: pair(teams.passCompletion, formatPercent) },
    {
      id: "keyPasses",
      values: pair(
        {
          home: keyPassesOf(stats, playerIds.home),
          away: keyPassesOf(stats, playerIds.away),
        },
        count,
      ),
    },
  ];
  return (
    <section className="panel" aria-labelledby="stats-title" data-testid="stats-panel">
      <h2 id="stats-title">{t("stats.title")}</h2>
      <dl className="stats">
        {rows.map((row) => (
          <div key={row.id} className="stats-row" data-testid={`stat-${row.id}`}>
            <dd data-side="home">{row.values.home}</dd>
            <dt>{t(`stats.label.${row.id}`)}</dt>
            <dd data-side="away">{row.values.away}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
