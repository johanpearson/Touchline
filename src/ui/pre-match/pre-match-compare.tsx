import { type Career, type Club, LINE_RATINGS } from "../../game";
import { Card } from "../components";
import { clubComparison } from "../hub-data";
import { CompareRow, useComparisonText } from "../hub-next-match";
import { useI18n } from "../i18n-provider";
import { lineRatingsOf } from "./pre-match-model";

type CompareProps = { career: Career; ours: Club; theirs: Club };

/** League position, the last five matches and the line ratings of the user's club next to the opponent's. */
export function PreMatchCompare({ career, ours, theirs }: CompareProps) {
  const { t, formatNumber } = useI18n();
  const text = useComparisonText();
  const a = clubComparison(career, ours.id);
  const b = clubComparison(career, theirs.id);
  const ratingsA = lineRatingsOf(career, ours.id);
  const ratingsB = lineRatingsOf(career, theirs.id);
  const rows = [
    {
      id: "position",
      label: t("hub.compare.position"),
      us: text.position(a),
      them: text.position(b),
    },
    { id: "form", label: t("hub.compare.form"), us: text.form(a), them: text.form(b) },
    ...LINE_RATINGS.map((line) => ({
      id: line,
      label: t(`rating.${line}`),
      us: formatNumber(ratingsA[line], 0),
      them: formatNumber(ratingsB[line], 0),
    })),
  ];
  return (
    <Card
      role="region"
      aria-labelledby="pre-match-compare-title"
      data-testid="pre-match-compare"
      className="flex flex-col gap-2"
    >
      <h2 id="pre-match-compare-title" className="m-0 font-heading text-lg text-text">
        {t("hub.compare.title")}
      </h2>
      <dl className="m-0 divide-y divide-line">
        {rows.map((row) => (
          <CompareRow key={row.id} {...row} ours={ours} theirs={theirs} />
        ))}
      </dl>
    </Card>
  );
}
