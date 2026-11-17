import type { Career, Fixture } from "../../game";
import { Button } from "../components";
import { useI18n } from "../i18n-provider";
import type { MatchSetup } from "../match-setup";
import { hrefFor } from "../routes";
import { PreMatchCompare } from "./pre-match-compare";
import { PreMatchLineup } from "./pre-match-lineup";
import { preMatchLineup, userSideOf } from "./pre-match-model";
import { PreMatchTeams } from "./pre-match-teams";

export type PreMatchScreenProps = {
  career: Career;
  fixture: Fixture;
  setup: MatchSetup;
  onKickOff: () => void;
  onQuickSim: () => void;
};

/** On a phone the actions sit in a bar above the tab bar (56 px) with a 52 px primary button. */
const ACTIONS =
  "flex flex-wrap gap-3 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-[calc(3.5rem+env(safe-area-inset-bottom))] max-sm:z-10 max-sm:flex-nowrap max-sm:border-t max-sm:border-line max-sm:bg-side max-sm:p-3";

const clubsOf = (career: Career, fixture: Fixture) => {
  const find = (id: string) => career.league.clubs.find((c) => c.id === id);
  const home = find(fixture.homeClubId);
  const away = find(fixture.awayClubId);
  if (!home || !away) return null;
  const ours = userSideOf(career, fixture) === "home" ? home : away;
  return { home, away, ours, theirs: ours === home ? away : home };
};

/**
 * The step before kickoff: both teams with the kits they wear, a comparison, the user's lineup and bench and
 * the tactics, with the actions to kick off, edit the plan or quick sim. It reads the same match setup the
 * match view plays, so what is shown is what is played.
 */
export function PreMatchScreen({
  career,
  fixture,
  setup,
  onKickOff,
  onQuickSim,
}: PreMatchScreenProps) {
  const { t } = useI18n();
  const clubs = clubsOf(career, fixture);
  if (!clubs) return null;
  const { home, away, ours, theirs } = clubs;
  const userIsHome = ours === home;
  const { starters, bench } = preMatchLineup(career, fixture, setup);
  return (
    <section data-testid="pre-match" className="flex flex-col gap-4 max-sm:pb-24">
      <h1 className="m-0 font-heading text-3xl font-semibold text-text">{t("prematch.title")}</h1>
      <div className={ACTIONS} data-testid="pre-match-actions">
        <Button
          variant="primary"
          size="lg"
          data-testid="kick-off"
          className="min-h-13 max-sm:flex-1"
          onClick={onKickOff}
        >
          {t("prematch.kickOff")}
        </Button>
        <Button asChild variant="secondary" size="lg" className="max-sm:flex-1">
          <a data-testid="edit-lineup" href={hrefFor({ name: "tactics" })}>
            {t("prematch.editLineup")}
          </a>
        </Button>
        <Button variant="secondary" size="lg" data-testid="quick-sim" onClick={onQuickSim}>
          {t("hub.quickSim")}
        </Button>
      </div>
      <PreMatchTeams
        fixture={fixture}
        season={career.season}
        home={home}
        away={away}
        setup={setup}
        userIsHome={userIsHome}
      />
      <div className="grid items-start gap-4 md:grid-cols-2 lg:gap-6">
        <PreMatchLineup starters={starters} bench={bench} plan={career.squadPlan} />
        <PreMatchCompare career={career} ours={ours} theirs={theirs} />
      </div>
    </section>
  );
}
