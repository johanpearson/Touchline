import { computeTable } from "../game";
import { useI18n } from "./i18n-provider";
import { ClubChip } from "./league-table";
import { Redirect } from "./redirect";
import { hrefFor } from "./routes";
import { useCareer } from "./use-career";

/** The results of the matchday just completed and the user's updated table position. */
export function MatchdayResultsScreen() {
  const { t, formatNumber } = useI18n();
  const { career } = useCareer();
  if (!career || career.season.currentMatchday <= 1) return <Redirect to={{ name: "home" }} />;
  const matchday = career.season.currentMatchday - 1;
  const clubs = new Map(career.league.clubs.map((club) => [club.id, club]));
  const resultByFixture = new Map(career.season.results.map((r) => [r.fixtureId, r]));
  const rows = career.season.fixtures
    .filter((f) => f.matchday === matchday)
    .flatMap((fixture) => {
      const result = resultByFixture.get(fixture.id);
      const home = clubs.get(fixture.homeClubId);
      const away = clubs.get(fixture.awayClubId);
      return result && home && away ? [{ fixture, result, home, away }] : [];
    });
  const table = computeTable(
    career.league.clubs.map((club) => club.id),
    career.season.results,
  );
  const position = table.ok ? table.table.find((r) => r.clubId === career.userClubId) : undefined;
  const seasonOver =
    career.season.currentMatchday > Math.max(...career.season.fixtures.map((f) => f.matchday));

  return (
    <section data-testid="matchday-results">
      <h2>{t("results.title", { matchday })}</h2>
      <ul className="fixture-list">
        {rows.map(({ fixture, result, home, away }) => {
          const isUser = home.id === career.userClubId || away.id === career.userClubId;
          return (
            <li
              key={fixture.id}
              data-testid={`result-${fixture.id}`}
              className={isUser ? "user-fixture" : undefined}
            >
              <ClubChip club={home} /> {home.name}{" "}
              <span data-testid={`result-score-${fixture.id}`}>
                {formatNumber(result.homeGoals, 0)} – {formatNumber(result.awayGoals, 0)}
              </span>{" "}
              {away.name} <ClubChip club={away} />
            </li>
          );
        })}
      </ul>
      {position && (
        <p data-testid="user-position">
          {t("results.position", { position: position.position, points: position.points })}
        </p>
      )}
      <a
        className="button"
        data-testid="results-continue"
        href={hrefFor({ name: seasonOver ? "season-end" : "home" })}
      >
        {t(seasonOver ? "results.toSeasonEnd" : "results.toHub")}
      </a>
    </section>
  );
}
