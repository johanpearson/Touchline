import type { Career } from "../game";
import { type Club, computeTable } from "../game";
import type { MessageKey } from "../i18n";
import { useI18n } from "./i18n-provider";
import { hrefFor } from "./routes";

type NumericColumn =
  | "played"
  | "won"
  | "drawn"
  | "lost"
  | "goalsFor"
  | "goalsAgainst"
  | "goalDifference"
  | "points";

const COLUMNS: ReadonlyArray<{ key: NumericColumn; label: MessageKey; full: MessageKey }> = [
  { key: "played", label: "league.col.played", full: "league.col.played.full" },
  { key: "won", label: "league.col.won", full: "league.col.won.full" },
  { key: "drawn", label: "league.col.drawn", full: "league.col.drawn.full" },
  { key: "lost", label: "league.col.lost", full: "league.col.lost.full" },
  { key: "goalsFor", label: "league.col.goalsFor", full: "league.col.goalsFor.full" },
  { key: "goalsAgainst", label: "league.col.goalsAgainst", full: "league.col.goalsAgainst.full" },
  {
    key: "goalDifference",
    label: "league.col.goalDifference",
    full: "league.col.goalDifference.full",
  },
  { key: "points", label: "league.col.points", full: "league.col.points.full" },
];

export function ClubChip({ club }: { club: Club }) {
  return (
    <span
      className="club-colours"
      aria-hidden="true"
      style={{
        background: `linear-gradient(90deg, ${club.colours.primary} 50%, ${club.colours.secondary} 50%)`,
      }}
    />
  );
}

export function LeagueTable({ career }: { career: Career }) {
  const { t, formatNumber, formatSigned } = useI18n();
  const result = computeTable(
    career.league.clubs.map((club) => club.id),
    career.season.results,
  );
  if (!result.ok) return null;
  const clubs = new Map(career.league.clubs.map((club) => [club.id, club]));
  return (
    <table className="league-table" data-testid="league-table">
      <thead>
        <tr>
          <th scope="col" className="num" aria-label={t("league.col.position.full")}>
            {t("league.col.position")}
          </th>
          <th scope="col">{t("league.col.club")}</th>
          {COLUMNS.map((column) => (
            <th key={column.key} scope="col" className="num" aria-label={t(column.full)}>
              {t(column.label)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.table.map((row) => {
          const club = clubs.get(row.clubId);
          if (!club) return null;
          return (
            <tr
              key={row.clubId}
              data-testid={`table-row-${row.clubId}`}
              aria-current={row.clubId === career.userClubId ? "true" : undefined}
              className={row.clubId === career.userClubId ? "user-row" : undefined}
            >
              <td className="num" data-testid={`table-position-${row.clubId}`}>
                {formatNumber(row.position, 0)}
              </td>
              <td className="club-cell">
                <ClubChip club={club} />
                <a href={hrefFor({ name: "club", clubId: club.id })}>{club.name}</a>
              </td>
              {COLUMNS.map((column) => (
                <td
                  key={column.key}
                  className="num"
                  data-testid={column.key === "points" ? `table-points-${row.clubId}` : undefined}
                >
                  {column.key === "goalDifference"
                    ? formatSigned(row[column.key])
                    : formatNumber(row[column.key], 0)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
