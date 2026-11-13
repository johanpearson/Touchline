import { summariseSeason } from "../game";
import { useI18n } from "./i18n-provider";
import { ClubChip } from "./league-table";
import { Redirect } from "./redirect";
import { hrefFor } from "./routes";
import { useCareer } from "./use-career";

/** The finished season: champion, final table, the user's finish and the top scorers. */
export function SeasonEndScreen() {
  const { t, formatNumber, formatSigned } = useI18n();
  const { career, startNextSeason } = useCareer();
  const result = career ? summariseSeason(career) : null;
  if (!career || !result?.ok) return <Redirect to={{ name: "home" }} />;
  const { summary } = result;
  const clubs = new Map(career.league.clubs.map((club) => [club.id, club]));
  const champion = clubs.get(summary.championId);
  const record = summary.userRecord;

  const next = () => {
    if (startNextSeason() === null) window.location.hash = hrefFor({ name: "home" });
  };

  return (
    <section data-testid="screen-season-end">
      <h2>{t("seasonEnd.title", { season: summary.seasonNumber })}</h2>
      <p data-testid="champion">
        {t("seasonEnd.champion")}: {champion?.name}
      </p>
      <p data-testid="user-finish">
        {t("seasonEnd.yourFinish", { position: summary.userPosition })} –{" "}
        {t("seasonEnd.record", {
          won: record.won,
          drawn: record.drawn,
          lost: record.lost,
          points: record.points,
        })}
      </p>
      <table className="league-table" data-testid="final-table">
        <thead>
          <tr>
            <th scope="col" className="num">
              {t("league.col.position")}
            </th>
            <th scope="col">{t("league.col.club")}</th>
            <th scope="col" className="num">
              {t("league.col.played")}
            </th>
            <th scope="col" className="num">
              {t("league.col.goalDifference")}
            </th>
            <th scope="col" className="num">
              {t("league.col.points")}
            </th>
          </tr>
        </thead>
        <tbody>
          {summary.finalTable.map((row) => {
            const club = clubs.get(row.clubId);
            if (!club) return null;
            return (
              <tr
                key={row.clubId}
                data-testid={`final-row-${row.clubId}`}
                className={row.clubId === career.userClubId ? "user-row" : undefined}
              >
                <td className="num">{formatNumber(row.position, 0)}</td>
                <td className="club-cell">
                  <ClubChip club={club} /> {club.name}
                </td>
                <td className="num">{formatNumber(row.played, 0)}</td>
                <td className="num">{formatSigned(row.goalDifference)}</td>
                <td className="num">{formatNumber(row.points, 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <h3>{t("seasonEnd.topScorers")}</h3>
      <ol data-testid="top-scorers">
        {summary.topScorers.map((scorer) => (
          <li key={`${scorer.clubId}-${scorer.name}`}>
            {scorer.name} ({clubs.get(scorer.clubId)?.name}) – {formatNumber(scorer.goals, 0)}
          </li>
        ))}
      </ol>
      <button type="button" data-testid="next-season" onClick={next}>
        {t("seasonEnd.next")}
      </button>
    </section>
  );
}
