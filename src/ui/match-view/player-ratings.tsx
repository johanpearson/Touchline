import type { PerSide } from "../../engine";
import { useI18n } from "../i18n-provider";
import type { RatingRow } from "./ratings-table";

export type PlayerRatingsProps = {
  rows: readonly RatingRow[];
  teamNames: PerSide<string>;
};

/** The full-time table of player ratings; numbers are text, the best player also carries a label. */
export function PlayerRatings({ rows, teamNames }: PlayerRatingsProps) {
  const { t, formatNumber } = useI18n();
  return (
    <section className="panel" aria-labelledby="ratings-title" data-testid="player-ratings">
      <h2 id="ratings-title">{t("ratings.title")}</h2>
      <table className="ratings">
        <thead>
          <tr>
            <th scope="col">{t("ratings.player")}</th>
            <th scope="col">{t("ratings.team")}</th>
            <th scope="col">{t("ratings.rating")}</th>
            <th scope="col">{t("ratings.goals")}</th>
            <th scope="col">{t("ratings.keyPasses")}</th>
            <th scope="col">{t("ratings.shots")}</th>
            <th scope="col">{t("ratings.xg")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              data-testid={`rating-row-${row.id}`}
              data-side={row.side}
              data-potm={row.playerOfTheMatch ? "true" : undefined}
            >
              <th scope="row">
                {row.name}
                {row.playerOfTheMatch && (
                  <span className="potm" data-testid="player-of-the-match">
                    {" "}
                    ★ {t("ratings.playerOfTheMatch")}
                  </span>
                )}
              </th>
              <td>{teamNames[row.side]}</td>
              <td>{formatNumber(row.rating, 1)}</td>
              <td>{row.goals}</td>
              <td>{row.keyPasses}</td>
              <td>{row.shots}</td>
              <td>{formatNumber(row.xg, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
