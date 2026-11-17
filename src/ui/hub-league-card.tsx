import type { CSSProperties } from "react";
import type { Career, Club } from "../game";
import { Card, EmptyState } from "./components";
import { careerTable, miniTableRows } from "./hub-data";
import { useI18n } from "./i18n-provider";
import { hrefFor } from "./routes";
import { ClubCrest } from "./shell/club-crest";

// Written out in full so Tailwind finds the class.
const EDGE = "shadow-[inset_4px_0_0_var(--row-accent,var(--accent))]";

type RowProps = {
  club: Club;
  position: number;
  goalDifference: number;
  points: number;
  own: boolean;
};

function TableRow({ club, position, goalDifference, points, own }: RowProps) {
  const { formatNumber, formatSigned } = useI18n();
  return (
    <li
      data-testid={`hub-table-row-${club.id}`}
      aria-current={own ? "true" : undefined}
      style={own ? ({ "--row-accent": club.colours.primary } as CSSProperties) : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 tabular-nums ${own ? `bg-glow ${EDGE}` : ""}`}
    >
      <span className="w-6 shrink-0 text-right text-muted">{formatNumber(position, 0)}</span>
      <ClubCrest shortName={club.shortName} colours={club.colours} size={24} />
      <span className="min-w-0 flex-1 break-words text-text">{club.name}</span>
      <span className="shrink-0 text-muted">{formatSigned(goalDifference)}</span>
      <strong className="w-8 shrink-0 text-right font-heading text-lg text-text">
        {formatNumber(points, 0)}
      </strong>
    </li>
  );
}

/** The user's neighbourhood of the league table, or an empty state before the first match. */
export function HubLeagueCard({ career }: { career: Career }) {
  const { t } = useI18n();
  const clubs = new Map(career.league.clubs.map((club) => [club.id, club]));
  const rows = miniTableRows(careerTable(career), career.userClubId);
  const started = career.season.results.length > 0 && rows.length > 0;
  return (
    <Card aria-labelledby="hub-table-title" role="region" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="hub-table-title" className="m-0 font-heading text-xl text-text">
          {t("hub.table.title")}
        </h2>
        <a
          className="inline-flex min-h-11 items-center rounded-sm text-[15px] font-semibold text-info underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          data-testid="hub-full-table"
          href={hrefFor({ name: "league" })}
        >
          {t("hub.table.full")}
        </a>
      </div>
      {started ? (
        <ol aria-label={t("hub.table.label")} className="m-0 flex list-none flex-col gap-1 p-0">
          {rows.map((row) => {
            const club = clubs.get(row.clubId);
            return club ? (
              <TableRow
                key={row.clubId}
                club={club}
                position={row.position}
                goalDifference={row.goalDifference}
                points={row.points}
                own={row.clubId === career.userClubId}
              />
            ) : null;
          })}
        </ol>
      ) : (
        <EmptyState
          data-testid="hub-table-empty"
          title={t("hub.empty.title")}
          text={t("hub.empty.text")}
        />
      )}
    </Card>
  );
}
