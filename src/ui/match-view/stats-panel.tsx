import type { MatchStats, PerSide } from "../../engine";
import { useI18n } from "../i18n-provider";

type Row = {
  id: "possession" | "fieldTilt" | "shots" | "shotsOnTarget" | "xg" | "corners";
  values: PerSide<string>;
};

export type StatsPanelProps = { stats: MatchStats };

/** Possession, field tilt, shots, shots on target, xG and corners for both teams. */
export function StatsPanel({ stats }: StatsPanelProps) {
  const { t, formatPercent, formatNumber } = useI18n();
  const pair = (values: PerSide<number>, format: (n: number) => string): PerSide<string> => ({
    home: format(values.home),
    away: format(values.away),
  });
  const percent = (n: number) => formatPercent(n);
  const count = (n: number) => String(n);
  const rows: Row[] = [
    { id: "possession", values: pair(stats.possession, percent) },
    { id: "fieldTilt", values: pair(stats.fieldTilt, percent) },
    { id: "shots", values: pair(stats.shots, count) },
    { id: "shotsOnTarget", values: pair(stats.shotsOnTarget, count) },
    { id: "xg", values: pair(stats.xg, (n) => formatNumber(n, 2)) },
    { id: "corners", values: pair(stats.corners, count) },
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
