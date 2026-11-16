import { type Career, getNextFixture, isSeasonComplete, simulateFixture } from "../game";
import { Button, Card } from "./components";
import { HubLeagueCard } from "./hub-league-card";
import { NextMatchCard } from "./hub-next-match";
import { HubSquadCard } from "./hub-squad-card";
import { useI18n } from "./i18n-provider";
import { hrefFor } from "./routes";
import { useCareer } from "./use-career";

function SeasonComplete() {
  const { t } = useI18n();
  return (
    <Card
      tone="raised"
      radius="xl"
      padding="lg"
      role="region"
      aria-labelledby="hub-season-complete"
      className="flex flex-col items-start gap-4"
      data-testid="season-complete"
    >
      <h2 id="hub-season-complete" className="m-0 font-heading text-3xl text-text">
        {t("hub.seasonComplete")}
      </h2>
      <Button asChild variant="primary" size="lg">
        <a data-testid="to-season-end" href={hrefFor({ name: "season-end" })}>
          {t("hub.toSeasonEnd")}
        </a>
      </Button>
    </Card>
  );
}

type ViewProps = { career: Career; onQuickSim: () => void };

/** The home dashboard: next match, mini league table and squad status. */
export function CareerHubView({ career, onQuickSim }: ViewProps) {
  const { t } = useI18n();
  const ours = career.league.clubs.find((c) => c.id === career.userClubId);
  const fixture = getNextFixture(career.season, career.userClubId);
  const opponentId =
    fixture?.homeClubId === career.userClubId ? fixture.awayClubId : fixture?.homeClubId;
  const theirs = career.league.clubs.find((c) => c.id === opponentId);
  return (
    <section className="flex flex-col gap-4" data-testid="career-hub">
      <h1 className="m-0 font-heading text-3xl font-semibold text-text">{t("hub.title")}</h1>
      {fixture && ours && theirs ? (
        <NextMatchCard
          career={career}
          fixture={fixture}
          ours={ours}
          theirs={theirs}
          onQuickSim={onQuickSim}
        />
      ) : (
        isSeasonComplete(career.season) && <SeasonComplete />
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <HubLeagueCard career={career} />
        <HubSquadCard career={career} />
      </div>
    </section>
  );
}

export function CareerHubScreen() {
  const { career, completeMatch } = useCareer();
  if (!career) return null;
  const quickSim = () => {
    const fixture = getNextFixture(career.season, career.userClubId);
    if (!fixture) return;
    if (completeMatch(simulateFixture(career, fixture)) === null) {
      window.location.hash = hrefFor({ name: "results" });
    }
  };
  return <CareerHubView career={career} onQuickSim={quickSim} />;
}
