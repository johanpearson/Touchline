import { useMemo } from "react";
import { type Career, type Club, computeTable, kitsOf } from "../game";
import { clubColumns, clubTieBreak } from "./club-columns";
import { type ClubSquadRow, clubSquadRows } from "./club-rows";
import { FixturesSection, FormSection, HistorySection, RatingsSection } from "./club-sections";
import { Badge, Button, Card, DataTable } from "./components";
import { useI18n } from "./i18n-provider";
import { NotFoundScreen } from "./not-found-screen";
import { hrefFor } from "./routes";
import { ClubCrest } from "./shell/club-crest";
import { useDensity } from "./theme/density-provider";

const POSITION_RANK = { GK: 0, DEF: 1, MID: 2, FWD: 3 } as const;
type Line = keyof typeof POSITION_RANK;

/** A kit as a swatch: body with a trim stripe, outlined so very light colours stay visible. */
function KitSwatch({ body, trim, label }: { body: string; trim: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-soft">
      <span
        aria-hidden="true"
        className="inline-flex h-6 w-9 flex-col overflow-hidden rounded-sm shadow-[0_0_0_1px_var(--line)]"
      >
        <span className="h-1.5" style={{ background: trim }} />
        <span className="flex-1" style={{ background: body }} />
      </span>
      {label}
    </span>
  );
}

function ClubHeader({ club, career }: { club: Club; career: Career }) {
  const { t, formatNumber } = useI18n();
  const table = computeTable(
    career.league.clubs.map((c) => c.id),
    career.season.results,
  );
  const row = table.ok ? table.table.find((r) => r.clubId === club.id) : undefined;
  const kits = kitsOf(club);
  const mine = club.id === career.userClubId;
  return (
    <Card
      tone="raised"
      radius="xl"
      padding="lg"
      className="flex flex-col gap-4 border-l-4 sm:flex-row sm:items-center"
      style={{ borderLeftColor: club.colours.primary }}
      data-testid="club-header"
    >
      <ClubCrest shortName={club.shortName} colours={club.colours} size={72} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2
            className="m-0 min-w-0 break-words font-heading text-4xl text-text"
            data-testid="club-name"
          >
            {club.name}
          </h2>
          {mine ? (
            <Badge tone="info" data-testid="your-club">
              {t("club.yourClub")}
            </Badge>
          ) : null}
        </div>
        <p className="m-0 text-soft" data-testid="club-league">
          {career.league.name}
        </p>
        {row ? (
          <p className="m-0 flex flex-wrap gap-x-4 text-text tabular">
            <span data-testid="club-position">
              {t("club.position", { position: formatNumber(row.position, 0) })}
            </span>
            <span data-testid="club-points">
              {t("club.points", { points: formatNumber(row.points, 0) })}
            </span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-x-6 gap-y-2" data-testid="club-kits">
          <KitSwatch {...kits.home} label={t("club.kit.home")} />
          <KitSwatch {...kits.away} label={t("club.kit.away")} />
        </div>
      </div>
      {mine ? (
        <Button asChild variant="secondary">
          <a href={hrefFor({ name: "tactics" })} data-testid="edit-lineup">
            {t("squad.editLineup")}
          </a>
        </Button>
      ) : null}
    </Card>
  );
}

function SquadSection({ club, career }: { club: Club; career: Career }) {
  const { t, formatNumber, locale } = useI18n();
  const { density } = useDensity();
  const columns = useMemo(
    () => clubColumns({ t, formatNumber, barColour: club.colours.primary }),
    [t, formatNumber, club.colours.primary],
  );
  const rows = useMemo(() => {
    const ids = new Set(club.playerIds);
    const players = career.league.players.filter((p) => ids.has(p.id));
    return clubSquadRows(players, career.condition);
  }, [club.playerIds, career.league.players, career.condition]);
  return (
    <section className="flex flex-col gap-3">
      <h3 className="m-0 font-heading text-xl text-text">{t("club.squad")}</h3>
      <div data-testid="squad-table">
        <DataTable<ClubSquadRow>
          label={t("club.squadTable")}
          columns={columns}
          rows={rows}
          rowKey={(row) => row.player.id}
          rowAttributes={(row) => ({
            "data-testid": `squad-row-${row.player.id}`,
            "data-best-eleven": row.inBestEleven ? "true" : "false",
          })}
          labels={{
            sortBy: t("squad.sort.by"),
            ascending: t("squad.sort.ascending"),
            descending: t("squad.sort.descending"),
          }}
          density={density}
          locale={locale}
          defaultSort={{ id: "overall", direction: "desc" }}
          tieBreak={clubTieBreak}
          groupBy={(row) => row.player.position}
          groupLabel={(key) => t(`position.${key as Line}`)}
        />
      </div>
    </section>
  );
}

/** The read-only club screen. Shows the not-found view for an unknown club id. */
export function ClubView({ career, clubId }: { career: Career; clubId: string }) {
  const club = career.league.clubs.find((c) => c.id === clubId);
  if (!club) return <NotFoundScreen />;
  return (
    <section data-testid="club-screen" className="flex min-w-0 flex-col gap-6">
      <ClubHeader club={club} career={career} />
      <div className="grid gap-4 md:grid-cols-2">
        <FormSection clubId={clubId} career={career} />
        <FixturesSection clubId={clubId} career={career} />
      </div>
      <RatingsSection club={club} career={career} />
      <HistorySection clubId={clubId} career={career} />
      <SquadSection club={club} career={career} />
    </section>
  );
}
