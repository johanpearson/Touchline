import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { useMemo } from "react";
import type { Career } from "../game";
import { buttonStyles } from "./components/button-styles";
import { Card } from "./components/card";
import { cn } from "./components/cn";
import { DataTable } from "./components/data-table";
import { useI18n } from "./i18n-provider";
import { leagueColumns } from "./league-columns";
import {
  buildMatchdayView,
  type MatchdayRow,
  type MatchdayView,
  standingsWindow,
} from "./matchday-view";
import { Redirect } from "./redirect";
import { hrefFor } from "./routes";
import { ClubCrest } from "./shell/club-crest";
import { useDensity } from "./theme/density-provider";
import { useCareer } from "./use-career";

function ResultRow({ row, big }: { row: MatchdayRow; big?: boolean }) {
  const { formatNumber } = useI18n();
  const { fixture, result, home, away } = row;
  const crest = big ? 40 : 28;
  return (
    <div
      data-testid={`result-${fixture.id}`}
      data-user={row.isUser ? "true" : undefined}
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3",
        big ? "font-heading text-xl font-semibold" : "text-[15px]",
      )}
    >
      <span className="flex min-w-0 items-center justify-end gap-2 text-right">
        <span className="min-w-0 truncate">{home.name}</span>
        <ClubCrest
          shortName={home.shortName}
          colours={home.colours}
          size={crest}
          className="shrink-0"
        />
      </span>
      <strong
        data-testid={`result-score-${fixture.id}`}
        className={cn(
          "text-center tabular-nums whitespace-nowrap",
          big ? "text-4xl font-bold" : "font-semibold",
        )}
      >
        {formatNumber(result.homeGoals, 0)} – {formatNumber(result.awayGoals, 0)}
      </strong>
      <span className="flex min-w-0 items-center gap-2">
        <ClubCrest
          shortName={away.shortName}
          colours={away.colours}
          size={crest}
          className="shrink-0"
        />
        <span className="min-w-0 truncate">{away.name}</span>
      </span>
    </div>
  );
}

function Movement({ view }: { view: MatchdayView }) {
  const { t } = useI18n();
  const { movement } = view;
  if (!movement) return null;
  const Icon = { up: ArrowUp, down: ArrowDown, same: Minus }[movement.direction];
  const text =
    movement.direction === "same"
      ? t("results.movement.same")
      : t(`results.movement.${movement.direction}`, { count: movement.places });
  return (
    <span
      data-testid="user-movement"
      data-direction={movement.direction}
      className={cn(
        "inline-flex items-center gap-1 font-semibold",
        movement.direction === "up" && "text-good",
        movement.direction === "down" && "text-bad",
        movement.direction === "same" && "text-muted",
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {text}
    </span>
  );
}

function MiniTable({ view, userClubId }: { view: MatchdayView; userClubId: string }) {
  const { t, formatNumber, formatSigned, locale } = useI18n();
  const { density } = useDensity();
  const columns = useMemo(
    () =>
      leagueColumns({ t, formatNumber, formatSigned, userClubId }).filter((c) => c.priority === 1),
    [t, formatNumber, formatSigned, userClubId],
  );
  const rows = standingsWindow(view.standings, userClubId);
  return (
    <div data-testid="mini-table">
      <DataTable
        label={t("results.table")}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.clubId}
        rowAttributes={(row) => ({ "data-testid": `mini-row-${row.clubId}` })}
        labels={{ sortBy: "", ascending: "", descending: "" }}
        density={density}
        locale={locale}
        cards={false}
        highlight={(row) => row.clubId === userClubId}
        accent={(row) => row.club.colours.primary}
      />
    </div>
  );
}

/** The results of the matchday just completed, the user's match first, and the table around them. */
export function MatchdayResultsView({ career }: { career: Career }) {
  const { t } = useI18n();
  const view = buildMatchdayView(career);
  const [first, ...others] = view.rows;
  const userRow = first?.isUser ? first : undefined;
  const rest = userRow ? others : view.rows;
  const { userRow: standing } = view;
  return (
    <section data-testid="matchday-results" className="mx-auto flex max-w-3xl flex-col gap-5">
      <h2 className="m-0 font-heading text-3xl font-bold">
        {t("results.title", { matchday: view.matchday })}
      </h2>
      {userRow ? (
        <Card radius="xl" padding="lg" tone="raised" className="flex flex-col gap-3">
          <h3 className="m-0 text-sm font-semibold tracking-wide text-muted uppercase">
            {t("results.yourMatch")}
          </h3>
          <ResultRow row={userRow} big />
        </Card>
      ) : null}
      {standing ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p data-testid="user-position" className="m-0 text-lg font-semibold">
            {t("results.position", { position: standing.position, points: standing.points })}
          </p>
          <Movement view={view} />
        </Card>
      ) : null}
      <Card className="flex flex-col gap-3">
        <h3 className="m-0 text-sm font-semibold tracking-wide text-muted uppercase">
          {t("results.otherMatches")}
        </h3>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {rest.map((row) => (
            <li key={row.fixture.id}>
              <ResultRow row={row} />
            </li>
          ))}
        </ul>
      </Card>
      {standing ? <MiniTable view={view} userClubId={career.userClubId} /> : null}
      <a
        className={cn(buttonStyles({ variant: "primary", size: "lg" }), "self-start no-underline")}
        data-testid="results-continue"
        href={hrefFor({ name: view.seasonOver ? "season-end" : "home" })}
      >
        {t(view.seasonOver ? "results.toSeasonEnd" : "results.toHub")}
      </a>
    </section>
  );
}

export function MatchdayResultsScreen() {
  const { career } = useCareer();
  if (!career || career.season.currentMatchday <= 1) return <Redirect to={{ name: "home" }} />;
  return <MatchdayResultsView career={career} />;
}
