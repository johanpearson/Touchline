import { useState } from "react";
import {
  ATTRIBUTE_NAMES,
  type Career,
  type Club,
  computeForm,
  computeTable,
  deriveTeamProfile,
  pickBestEleven,
} from "../game";
import type { MessageKey } from "../i18n";
import { useI18n } from "./i18n-provider";
import { NotFoundScreen } from "./not-found-screen";
import {
  DEFAULT_SORT,
  groupSquad,
  type SortColumn,
  type SortState,
  type SquadRow,
} from "./squad-rows";

const UPCOMING_COUNT = 3;
const PHASES = [
  "buildUp",
  "progression",
  "chanceCreation",
  "finishing",
  "pressing",
  "defending",
  "goalkeeping",
] as const;

/** Low is 1-7, mid 8-13, high 14-20. The text value is always shown next to the colour. */
const bandOf = (value: number): "low" | "mid" | "high" =>
  value <= 7 ? "low" : value <= 13 ? "mid" : "high";

const nextSort = (current: SortState, column: SortColumn): SortState =>
  current.column === column
    ? { column, direction: current.direction === "desc" ? "asc" : "desc" }
    : { column, direction: column === "name" || column === "age" ? "asc" : "desc" };

function FormChips({ clubId, career }: { clubId: string; career: Career }) {
  const { t } = useI18n();
  const form = computeForm(clubId, career.season.results);
  return (
    <div data-testid="club-form">
      <h3>{t("club.form")}</h3>
      {form.length === 0 ? (
        <p data-testid="club-form-empty">{t("club.formEmpty")}</p>
      ) : (
        <ul className="form-chips">
          {form.map((outcome, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: the form list is a fixed-order sequence
              key={i}
              className={`form-chip form-${outcome}`}
              data-testid="form-chip"
              title={t(`club.form.${outcome}`)}
            >
              {outcome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Fixtures({ clubId, career }: { clubId: string; career: Career }) {
  const { t } = useI18n();
  const upcoming = career.season.fixtures
    .filter(
      (f) =>
        f.matchday >= career.season.currentMatchday &&
        (f.homeClubId === clubId || f.awayClubId === clubId),
    )
    .sort((a, b) => a.matchday - b.matchday)
    .slice(0, UPCOMING_COUNT);
  return (
    <div>
      <h3>{t("club.fixtures")}</h3>
      {upcoming.length === 0 ? (
        <p>{t("club.fixturesEmpty")}</p>
      ) : (
        <ul data-testid="club-fixtures">
          {upcoming.map((fixture) => {
            const home = fixture.homeClubId === clubId;
            const opponentId = home ? fixture.awayClubId : fixture.homeClubId;
            const opponent = career.league.clubs.find((c) => c.id === opponentId);
            return (
              <li key={fixture.id} data-venue={home ? "home" : "away"}>
                {t("club.fixture", {
                  matchday: fixture.matchday,
                  venue: t(home ? "club.venue.home" : "club.venue.away"),
                  opponent: opponent?.name ?? opponentId,
                })}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function History({ clubId, career }: { clubId: string; career: Career }) {
  const { t } = useI18n();
  if (career.history.length === 0) return null;
  return (
    <div>
      <h3>{t("club.history")}</h3>
      <ul data-testid="club-history">
        {career.history.map((summary) => (
          <li key={summary.seasonNumber}>
            {t("club.historyRow", {
              season: summary.seasonNumber,
              position: summary.finalTable.find((row) => row.clubId === clubId)?.position ?? "-",
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ratings({ club, career }: { club: Club; career: Career }) {
  const { t, formatNumber } = useI18n();
  const profile = deriveTeamProfile(club, career.league.players);
  return (
    <div>
      <h3>{t("club.ratings")}</h3>
      <dl className="club-ratings">
        {PHASES.map((phase) => (
          <div key={phase}>
            <dt>{t(`rating.${phase}`)}</dt>
            <dd data-testid={`rating-${phase}`}>{formatNumber(profile[phase] * 100, 0)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SortHeader({
  column,
  label,
  full,
  sort,
  onSort,
}: {
  column: SortColumn;
  label: string;
  full: string;
  sort: SortState;
  onSort: (column: SortColumn) => void;
}) {
  const active = sort.column === column;
  const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
  return (
    <th scope="col" aria-sort={ariaSort} className={column === "name" ? undefined : "num"}>
      <button
        type="button"
        data-testid={`sort-${column}`}
        aria-label={full}
        onClick={() => onSort(column)}
      >
        {label}
      </button>
    </th>
  );
}

function PlayerRow({ row }: { row: SquadRow }) {
  const { t, formatNumber } = useI18n();
  const { player } = row;
  return (
    <tr
      data-testid={`squad-row-${player.id}`}
      data-best-eleven={row.inBestEleven ? "true" : "false"}
      className={row.inBestEleven ? "best-eleven" : undefined}
    >
      <td>
        {row.inBestEleven ? (
          <span
            role="img"
            aria-label={t("club.bestEleven")}
            title={t("club.bestEleven")}
            data-testid={`best-eleven-mark-${player.id}`}
          >
            ★{" "}
          </span>
        ) : null}
        {player.name}
      </td>
      <td className="num">{player.age}</td>
      <td className="num">{formatNumber(row.overall, 1)}</td>
      <td className="num" data-testid={`fitness-${player.id}`}>
        {formatNumber(row.fitness, 0)}
      </td>
      <td className="num" data-testid={`form-${player.id}`}>
        {formatNumber(row.form, 0)}
      </td>
      {ATTRIBUTE_NAMES.map((name) => (
        <td
          key={name}
          className={`num attr attr-${bandOf(player[name])}`}
          data-band={bandOf(player[name])}
          data-testid={`attr-${player.id}-${name}`}
        >
          {player[name]}
        </td>
      ))}
    </tr>
  );
}

function SquadTable({ club, career }: { club: Club; career: Career }) {
  const { t } = useI18n();
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const players = career.league.players.filter((p) => club.playerIds.includes(p.id));
  const bestEleven = new Set(pickBestEleven(players).map((p) => p.id));
  const groups = groupSquad(players, bestEleven, sort, career.condition);
  const onSort = (column: SortColumn) => setSort((current) => nextSort(current, column));
  const header = { sort, onSort };
  return (
    <div>
      <h3>{t("club.squad")}</h3>
      <table className="squad-table" data-testid="squad-table">
        <thead>
          <tr>
            <SortHeader
              column="name"
              label={t("club.col.name")}
              full={t("club.col.name")}
              {...header}
            />
            <SortHeader
              column="age"
              label={t("club.col.age.short")}
              full={t("club.col.age")}
              {...header}
            />
            <SortHeader
              column="overall"
              label={t("club.col.overall.short")}
              full={t("club.col.overall")}
              {...header}
            />
            <SortHeader
              column="fitness"
              label={t("club.col.fitness.short")}
              full={t("club.col.fitness")}
              {...header}
            />
            <SortHeader
              column="form"
              label={t("club.col.form.short")}
              full={t("club.col.form")}
              {...header}
            />
            {ATTRIBUTE_NAMES.map((name) => (
              <SortHeader
                key={name}
                column={name}
                label={t(`attr.${name}.short` as MessageKey)}
                full={t(`attr.${name}` as MessageKey)}
                {...header}
              />
            ))}
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.position} data-testid={`squad-group-${group.position}`}>
            <tr className="squad-group-heading">
              <th scope="rowgroup" colSpan={5 + ATTRIBUTE_NAMES.length}>
                {t(`position.${group.position}`)}
              </th>
            </tr>
            {group.rows.map((row) => (
              <PlayerRow key={row.player.id} row={row} />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

/** The read-only club screen. Shows the not-found view for an unknown club id. */
export function ClubView({ career, clubId }: { career: Career; clubId: string }) {
  const { t, formatNumber } = useI18n();
  const club = career.league.clubs.find((c) => c.id === clubId);
  if (!club) return <NotFoundScreen />;
  const table = computeTable(
    career.league.clubs.map((c) => c.id),
    career.season.results,
  );
  const row = table.ok ? table.table.find((r) => r.clubId === clubId) : undefined;
  return (
    <section data-testid="club-screen" className="club-screen">
      <header className="club-header">
        <h2
          data-testid="club-name"
          style={{ background: club.colours.primary, color: club.colours.secondary }}
        >
          {club.name}
        </h2>
        {clubId === career.userClubId ? (
          <span className="your-club" data-testid="your-club">
            {t("club.yourClub")}
          </span>
        ) : null}
        {row ? (
          <p>
            <span data-testid="club-position">
              {t("club.position", { position: formatNumber(row.position, 0) })}
            </span>{" "}
            <span data-testid="club-points">
              {t("club.points", { points: formatNumber(row.points, 0) })}
            </span>
          </p>
        ) : null}
      </header>
      <FormChips clubId={clubId} career={career} />
      <Fixtures clubId={clubId} career={career} />
      <History clubId={clubId} career={career} />
      <Ratings club={club} career={career} />
      <SquadTable club={club} career={career} />
    </section>
  );
}
