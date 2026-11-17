import {
  type Career,
  type Club,
  computeForm,
  deriveClubLineRatings,
  LINE_RATINGS,
  type Outcome,
} from "../game";
import { Card } from "./components";
import { FormChips } from "./form-chips";
import { useI18n } from "./i18n-provider";

const UPCOMING_COUNT = 3;

const HEADING = "m-0 font-heading text-xl text-text";

/** The last five results as chips, or a plain sentence before the first match. */
export function FormSection({ clubId, career }: { clubId: string; career: Career }) {
  const { t } = useI18n();
  const form: Outcome[] = computeForm(clubId, career.season.results);
  return (
    <Card data-testid="club-form" className="flex flex-col gap-3">
      <h3 className={HEADING}>{t("club.form")}</h3>
      {form.length === 0 ? (
        <p className="m-0 text-muted" data-testid="club-form-empty">
          {t("club.formEmpty")}
        </p>
      ) : (
        <FormChips form={form} />
      )}
    </Card>
  );
}

/** The next three fixtures of the club, with opponent and venue. */
export function FixturesSection({ clubId, career }: { clubId: string; career: Career }) {
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
    <Card className="flex flex-col gap-3">
      <h3 className={HEADING}>{t("club.fixtures")}</h3>
      {upcoming.length === 0 ? (
        <p className="m-0 text-muted">{t("club.fixturesEmpty")}</p>
      ) : (
        <ul data-testid="club-fixtures" className="m-0 flex list-none flex-col gap-2 p-0">
          {upcoming.map((fixture) => {
            const home = fixture.homeClubId === clubId;
            const opponentId = home ? fixture.awayClubId : fixture.homeClubId;
            const opponent = career.league.clubs.find((c) => c.id === opponentId);
            return (
              <li
                key={fixture.id}
                data-venue={home ? "home" : "away"}
                className="min-w-0 break-words rounded-md bg-sunk px-3 py-2 text-text"
              >
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
    </Card>
  );
}

/** Finishing positions of the earlier seasons, one card each. Nothing before the first season ends. */
export function HistorySection({ clubId, career }: { clubId: string; career: Career }) {
  const { t, formatNumber } = useI18n();
  if (career.history.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h3 className={HEADING}>{t("club.history")}</h3>
      <ul
        data-testid="club-history"
        className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4"
      >
        {career.history.map((summary) => {
          const position = summary.finalTable.find((row) => row.clubId === clubId)?.position;
          return (
            <li key={summary.seasonNumber}>
              <Card className="flex h-full flex-col gap-1">
                <span className="text-sm text-muted">
                  {t("club.historySeason", { season: summary.seasonNumber })}
                </span>
                <span className="font-heading text-3xl tabular text-text">
                  <span className="sr-only">
                    {t("club.historyRow", { season: summary.seasonNumber, position: "" })}
                  </span>
                  {position === undefined ? "-" : formatNumber(position, 0)}
                </span>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The four line ratings and the overall as tiles; the number is the value, the bar a cue only. */
export function RatingsSection({ club, career }: { club: Club; career: Career }) {
  const { t, formatNumber } = useI18n();
  const ratings = deriveClubLineRatings(club, career.league.players);
  return (
    <section className="flex flex-col gap-3">
      <h3 className={HEADING}>{t("club.ratings")}</h3>
      <dl
        className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        data-testid="club-ratings"
      >
        {LINE_RATINGS.map((line) => (
          <div
            key={line}
            className={`flex min-w-0 flex-col gap-1 rounded-lg border border-line px-4 py-3 ${
              line === "overall" ? "bg-raised" : "bg-surface"
            }`}
          >
            <dt className="text-[13px] text-muted">{t(`rating.${line}`)}</dt>
            <dd
              className="m-0 font-heading text-4xl tabular text-text"
              data-testid={`rating-${line}`}
            >
              {formatNumber(ratings[line], 0)}
            </dd>
            <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-pill bg-track">
              <span
                className="block h-full rounded-pill"
                style={{ width: `${ratings[line]}%`, background: club.colours.primary }}
              />
            </span>
          </div>
        ))}
      </dl>
    </section>
  );
}
