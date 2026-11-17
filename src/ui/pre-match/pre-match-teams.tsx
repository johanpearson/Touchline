import { type Club, type Fixture, type Kit, kitsOf, type Season } from "../../game";
import { Badge, Card } from "../components";
import { roundCount } from "../hub-data";
import { useI18n } from "../i18n-provider";
import type { MatchSetup } from "../match-setup";
import { ClubCrest } from "../shell/club-crest";
import { KitIcon } from "../shell/kit-icon";

type TeamProps = { side: "home" | "away"; club: Club; kit: Kit };

function Team({ side, club, kit }: TeamProps) {
  const { t } = useI18n();
  const wearsHome = kit.body === kitsOf(club).home.body;
  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
      data-testid={`pre-match-${side}`}
    >
      <ClubCrest shortName={club.shortName} colours={club.colours} size={64} />
      <strong className="font-heading text-2xl leading-tight font-semibold break-words text-text sm:text-3xl">
        {club.name}
      </strong>
      <span
        className="flex items-center gap-2 text-[13px] text-muted"
        data-testid={`pre-match-kit-${side}`}
        data-body={kit.body}
        data-trim={kit.trim}
      >
        <KitIcon kit={kit} size={28} />
        {t(wearsHome ? "prematch.kit.home" : "prematch.kit.away")}
      </span>
    </div>
  );
}

export type PreMatchTeamsProps = {
  fixture: Fixture;
  season: Season;
  home: Club;
  away: Club;
  setup: MatchSetup;
  userIsHome: boolean;
};

/** Both clubs with the kits they will wear (the match view's colours), the round and the venue. */
export function PreMatchTeams({
  fixture,
  season,
  home,
  away,
  setup,
  userIsHome,
}: PreMatchTeamsProps) {
  const { t } = useI18n();
  return (
    <Card
      tone="raised"
      radius="xl"
      padding="lg"
      role="region"
      aria-label={t("prematch.teams")}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge data-testid="pre-match-round">
          {t("hub.round", { matchday: fixture.matchday, rounds: roundCount(season) })}
        </Badge>
        <Badge tone="info" data-testid="pre-match-venue">
          {t(userIsHome ? "hub.homeMatch" : "hub.awayMatch")}
        </Badge>
      </div>
      <div className="flex items-start gap-3">
        <Team side="home" club={home} kit={setup.kits.home} />
        <span className="pt-6 text-sm text-muted uppercase">{t("hub.vs")}</span>
        <Team side="away" club={away} kit={setup.kits.away} />
      </div>
    </Card>
  );
}
