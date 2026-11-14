import { getNextFixture, isSeasonComplete, simulateFixture } from "../game";
import { useI18n } from "./i18n-provider";
import { hrefFor } from "./routes";
import { useCareer } from "./use-career";

export function CareerHubScreen() {
  const { t } = useI18n();
  const { career, completeMatch } = useCareer();
  if (!career) return null;
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const fixture = getNextFixture(career.season, career.userClubId);
  const home = fixture?.homeClubId === career.userClubId;
  const opponentId = home ? fixture?.awayClubId : fixture?.homeClubId;
  const opponent = career.league.clubs.find((c) => c.id === opponentId);

  const quickSim = () => {
    if (!fixture) return;
    if (completeMatch(simulateFixture(career, fixture)) === null) {
      window.location.hash = hrefFor({ name: "results" });
    }
  };

  return (
    <section className="career-hub" data-testid="career-hub">
      <h2>{t("hub.title")}</h2>
      <p className="hub-club-name" data-testid="hub-club-name">
        {club?.name}
      </p>
      <p>{t("hub.league", { league: career.league.name })}</p>
      {fixture ? (
        <section className="next-match" data-testid="next-match">
          <h3>{t("hub.nextMatch")}</h3>
          <p data-testid="next-match-matchday">
            {t("hub.matchday", { matchday: fixture.matchday })}
          </p>
          <p data-testid="next-match-opponent">
            {t(home ? "hub.venue.home" : "hub.venue.away")} {opponent?.name}
          </p>
          <div className="next-match-actions">
            <a className="button" data-testid="play-match" href={hrefFor({ name: "match" })}>
              {t("hub.playMatch")}
            </a>
            <button type="button" data-testid="quick-sim" onClick={quickSim}>
              {t("hub.quickSim")}
            </button>
          </div>
        </section>
      ) : (
        isSeasonComplete(career.season) && (
          <section className="season-complete" data-testid="season-complete">
            <h3>{t("hub.seasonComplete")}</h3>
            <a
              className="button"
              data-testid="to-season-end"
              href={hrefFor({ name: "season-end" })}
            >
              {t("hub.toSeasonEnd")}
            </a>
          </section>
        )
      )}
    </section>
  );
}
