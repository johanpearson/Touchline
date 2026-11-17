import type { ReactNode } from "react";
import type { Translator } from "../i18n";
import { ChangeFlash, type Column } from "./components";
import { FormChips } from "./form-chips";
import type { LeagueRow } from "./league-rows";
import { hrefFor } from "./routes";
import { ClubCrest } from "./shell/club-crest";

type Count = "played" | "won" | "drawn" | "lost" | "goalsFor" | "goalsAgainst";

export type LeagueColumnContext = Pick<Translator, "t" | "formatNumber" | "formatSigned"> & {
  userClubId: string;
};

const LINK =
  "inline-flex min-h-6 items-center gap-2 rounded-sm text-text no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function ClubCell({ row, ctx }: { row: LeagueRow; ctx: LeagueColumnContext }) {
  const { club } = row;
  return (
    <a className={LINK} href={hrefFor({ name: "club", clubId: club.id })}>
      <ClubCrest shortName={club.shortName} colours={club.colours} size={24} />
      <span>{club.name}</span>
      {club.id === ctx.userClubId ? (
        <span className="sr-only">{ctx.t("league.yourClub")}</span>
      ) : null}
    </a>
  );
}

const numeric = (
  id: string,
  ctx: LeagueColumnContext,
  priority: 1 | 2 | 3,
  cell: (row: LeagueRow) => ReactNode,
): Column<LeagueRow> => ({
  id,
  header: ctx.t(`league.col.${id}` as "league.col.played"),
  fullHeader: ctx.t(`league.col.${id}.full` as "league.col.played.full"),
  priority,
  align: "end",
  cell,
});

/**
 * The league table's columns. The standings are the order, so no column sorts. Priorities: 1 position,
 * club, played, goal difference, points; 2 won, drawn, lost, form; 3 goals for and against.
 */
export function leagueColumns(ctx: LeagueColumnContext): Column<LeagueRow>[] {
  const { t, formatNumber, formatSigned } = ctx;
  const count = (key: Count, priority: 1 | 2 | 3) =>
    numeric(key, ctx, priority, (row) => (
      <ChangeFlash value={row[key]}>{formatNumber(row[key], 0)}</ChangeFlash>
    ));
  return [
    {
      id: "position",
      header: t("league.col.position"),
      fullHeader: t("league.col.position.full"),
      priority: 1,
      primary: true,
      align: "end",
      cell: (row) => (
        <span data-testid={`table-position-${row.clubId}`}>{formatNumber(row.position, 0)}</span>
      ),
    },
    {
      id: "club",
      header: t("league.col.club"),
      priority: 1,
      primary: true,
      cell: (row) => <ClubCell row={row} ctx={ctx} />,
    },
    count("played", 1),
    count("won", 2),
    count("drawn", 2),
    count("lost", 2),
    count("goalsFor", 3),
    count("goalsAgainst", 3),
    numeric("goalDifference", ctx, 1, (row) => (
      <ChangeFlash value={row.goalDifference}>{formatSigned(row.goalDifference)}</ChangeFlash>
    )),
    numeric("points", ctx, 1, (row) => (
      <ChangeFlash value={row.points}>
        <strong data-testid={`table-points-${row.clubId}`}>{formatNumber(row.points, 0)}</strong>
      </ChangeFlash>
    )),
    {
      id: "form",
      header: t("league.col.form"),
      fullHeader: t("league.col.form.full"),
      priority: 2,
      cell: (row) => <FormChips form={row.form} />,
    },
  ];
}
