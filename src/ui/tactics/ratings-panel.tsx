import { type Career, deriveLineRatings, LINE_RATINGS, type Player } from "../../game";
import { useI18n } from "../i18n-provider";

/** The derived team ratings (goalkeeping, defence, midfield, attack, overall); they follow the lineup live. */
export function RatingsPanel({ career, players }: { career: Career; players: readonly Player[] }) {
  const { t, formatNumber } = useI18n();
  const ratings = deriveLineRatings(players, career.squadPlan, career.condition);
  return (
    <div className="flex flex-col gap-2">
      <dl
        data-testid="plan-ratings"
        className="m-0 grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-2"
      >
        {LINE_RATINGS.map((line) => (
          <div key={line} className="rounded-md border border-line bg-sunk px-3 py-2">
            <dt className="text-xs text-muted">{t(`rating.${line}`)}</dt>
            <dd
              data-testid={`plan-rating-${line}`}
              className="m-0 font-heading text-2xl font-semibold text-text"
            >
              {formatNumber(ratings[line], 0)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-sm text-muted">{t("tactics.ratings.hint")}</p>
    </div>
  );
}
