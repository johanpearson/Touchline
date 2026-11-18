import { Trophy } from "lucide-react";
import { useMemo } from "react";
import { type Career, isWindowOpen, summariseSeason } from "../game";
import { Button } from "./components/button";
import { Card } from "./components/card";
import { cn } from "./components/cn";
import { DataTable } from "./components/data-table";
import { useI18n } from "./i18n-provider";
import { leagueColumns } from "./league-columns";
import { leagueRows } from "./league-rows";
import { Redirect } from "./redirect";
import { hrefFor } from "./routes";
import { ClubCrest } from "./shell/club-crest";
import { useDensity } from "./theme/density-provider";
import { useCareer } from "./use-career";

type Summary = Extract<ReturnType<typeof summariseSeason>, { ok: true }>["summary"];

function ChampionCard({ career, summary }: { career: Career; summary: Summary }) {
  const { t } = useI18n();
  const champion = career.league.clubs.find((club) => club.id === summary.championId);
  const userWon = summary.championId === career.userClubId;
  if (!champion) return null;
  return (
    <Card
      radius="xl"
      padding="lg"
      tone="raised"
      data-testid="champion-card"
      data-user-champion={userWon ? "true" : undefined}
      className={cn(
        "flex items-center gap-5",
        userWon &&
          "border-accent bg-[radial-gradient(circle_at_top_left,var(--glow),transparent_70%)]",
      )}
    >
      <ClubCrest
        shortName={champion.shortName}
        colours={champion.colours}
        size={72}
        className="shrink-0"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="m-0 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
          <Trophy aria-hidden="true" className="size-4 text-accent" />
          {t("seasonEnd.champion")}
        </p>
        <p data-testid="champion" className="m-0 font-heading text-3xl font-bold">
          {champion.name}
        </p>
        {userWon ? (
          <p data-testid="champion-message" className="m-0 text-lg font-semibold text-accent">
            {t("seasonEnd.youAreChampions")}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function FinalTable({ career }: { career: Career }) {
  const { t, formatNumber, formatSigned, locale } = useI18n();
  const { density } = useDensity();
  const rows = useMemo(() => leagueRows(career), [career]);
  const columns = useMemo(
    () => leagueColumns({ t, formatNumber, formatSigned, userClubId: career.userClubId }),
    [t, formatNumber, formatSigned, career.userClubId],
  );
  return (
    <div data-testid="final-table" className="flex flex-col gap-3">
      <h3 className="m-0 font-heading text-xl font-semibold">{t("seasonEnd.finalTable")}</h3>
      <DataTable
        label={t("seasonEnd.finalTable")}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.clubId}
        rowAttributes={(row) => ({ "data-testid": `final-row-${row.clubId}` })}
        labels={{ sortBy: "", ascending: "", descending: "" }}
        density={density}
        locale={locale}
        highlight={(row) => row.clubId === career.userClubId}
        accent={(row) => row.club.colours.primary}
      />
    </div>
  );
}

function TopScorers({ career, summary }: { career: Career; summary: Summary }) {
  const { t, formatNumber } = useI18n();
  const clubs = new Map(career.league.clubs.map((club) => [club.id, club]));
  return (
    <Card className="flex flex-col gap-3">
      <h3 className="m-0 font-heading text-xl font-semibold">{t("seasonEnd.topScorers")}</h3>
      <ol data-testid="top-scorers" className="m-0 flex list-none flex-col gap-2 p-0">
        {summary.topScorers.map((scorer, index) => {
          const club = clubs.get(scorer.clubId);
          return (
            <li
              key={`${scorer.clubId}-${scorer.name}`}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 tabular-nums"
            >
              <span className="text-muted">{formatNumber(index + 1, 0)}</span>
              <span className="min-w-0">
                <span className="font-semibold">{scorer.name}</span>
                <span className="text-muted"> · {club?.name}</span>
              </span>
              <strong>{t("seasonEnd.goals", { count: scorer.goals })}</strong>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/** The finished season (the next button opens the off-season): champion, the user's finish, the final table and the top scorers. */
export function SeasonEndView({
  career,
  summary,
  onNext,
}: {
  career: Career;
  summary: Summary;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const record = summary.userRecord;
  return (
    <section data-testid="screen-season-end" className="mx-auto flex max-w-4xl flex-col gap-5">
      <h2 className="m-0 font-heading text-3xl font-bold">
        {t("seasonEnd.title", { season: summary.seasonNumber })}
      </h2>
      <ChampionCard career={career} summary={summary} />
      <Card className="flex flex-col gap-1">
        <p data-testid="user-finish" className="m-0 text-lg font-semibold">
          {t("seasonEnd.yourFinish", { position: summary.userPosition })}
        </p>
        <p className="m-0 text-soft">
          {t("seasonEnd.record", {
            won: record.won,
            drawn: record.drawn,
            lost: record.lost,
            points: record.points,
          })}
        </p>
      </Card>
      <FinalTable career={career} />
      <TopScorers career={career} summary={summary} />
      <Button
        variant="primary"
        size="lg"
        className="self-start"
        data-testid="next-season"
        onClick={onNext}
      >
        {t("seasonEnd.next")}
      </Button>
    </section>
  );
}

export function SeasonEndScreen() {
  const { career, finishSeason } = useCareer();
  const result = career ? summariseSeason(career) : null;
  if (!career || !result?.ok) return <Redirect to={{ name: "home" }} />;
  // A season that was finished before (a save made in the off-season) goes straight on.
  const next = () => {
    const error = isWindowOpen(career) ? null : finishSeason();
    if (error === null) window.location.hash = hrefFor({ name: "off-season" });
  };
  return <SeasonEndView career={career} summary={result.summary} onNext={next} />;
}
