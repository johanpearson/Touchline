import type { Career, Club, Fixture } from "../game";
import { Badge, Button, Card } from "./components";
import { type ClubComparison, clubComparison, roundCount } from "./hub-data";
import { useI18n } from "./i18n-provider";
import { hrefFor } from "./routes";
import { ClubCrest } from "./shell/club-crest";

const NONE = "–";
const POINTS_PER_WIN = 3;

function TeamBlock({
  club,
  testId,
  nameTestId,
}: {
  club: Club;
  testId?: string;
  nameTestId?: string;
}) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
      data-testid={testId}
    >
      <ClubCrest shortName={club.shortName} colours={club.colours} size={64} />
      <strong
        className="font-heading text-2xl leading-tight font-semibold break-words text-text sm:text-3xl"
        data-testid={nameTestId}
      >
        {club.name}
      </strong>
    </div>
  );
}

export function useComparisonText() {
  const { t, formatNumber } = useI18n();
  return {
    position: (c: ClubComparison) => (c.position === null ? NONE : formatNumber(c.position, 0)),
    form: (c: ClubComparison) =>
      c.form.played === 0
        ? NONE
        : t("hub.compare.formValue", {
            points: c.form.points,
            max: c.form.played * POINTS_PER_WIN,
          }),
    rating: (c: ClubComparison) => formatNumber(c.rating, 0),
    goals: (c: ClubComparison) =>
      c.goalsPerGame === null ? NONE : formatNumber(c.goalsPerGame, 2),
  };
}

type RowProps = { id: string; label: string; us: string; them: string; ours: Club; theirs: Club };

export function CompareRow({ id, label, us, them, ours, theirs }: RowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2" data-testid={`compare-${id}`}>
      <dt className="min-w-0 text-[13px] text-muted">{label}</dt>
      <dd className="m-0 flex shrink-0 items-baseline gap-3 tabular-nums">
        <strong className="font-heading text-xl text-text">
          <span className="sr-only">{ours.name}: </span>
          {us}
        </strong>
        <span className="min-w-10 text-right text-soft">
          <span className="sr-only">{theirs.name}: </span>
          {them}
        </span>
      </dd>
    </div>
  );
}

function Comparison({ career, ours, theirs }: { career: Career; ours: Club; theirs: Club }) {
  const { t } = useI18n();
  const text = useComparisonText();
  const a = clubComparison(career, ours.id);
  const b = clubComparison(career, theirs.id);
  const rows = [
    { id: "position", label: t("hub.compare.position"), pick: text.position },
    { id: "form", label: t("hub.compare.form"), pick: text.form },
    { id: "rating", label: t("hub.compare.rating"), pick: text.rating },
    { id: "goals", label: t("hub.compare.goals"), pick: text.goals },
  ];
  return (
    <section aria-label={t("hub.compare.title")}>
      <dl className="m-0 divide-y divide-line">
        {rows.map((row) => (
          <CompareRow
            key={row.id}
            id={row.id}
            label={row.label}
            us={row.pick(a)}
            them={row.pick(b)}
            ours={ours}
            theirs={theirs}
          />
        ))}
      </dl>
    </section>
  );
}

type NextMatchProps = {
  career: Career;
  fixture: Fixture;
  ours: Club;
  theirs: Club;
  onQuickSim: () => void;
};

/** The next match: both clubs, venue and round, a comparison from the career and the two actions. */
export function NextMatchCard({ career, fixture, ours, theirs, onQuickSim }: NextMatchProps) {
  const { t } = useI18n();
  const home = fixture.homeClubId === ours.id;
  return (
    <Card
      tone="raised"
      radius="xl"
      padding="lg"
      className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
      role="region"
      data-testid="next-match"
      aria-labelledby="hub-next-match-title"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="hub-next-match-title" className="m-0 font-heading text-lg text-soft">
            {t("hub.nextMatch")}
          </h2>
          <Badge data-testid="next-match-matchday">
            {t("hub.round", { matchday: fixture.matchday, rounds: roundCount(career.season) })}
          </Badge>
          <Badge tone="info">{t(home ? "hub.homeMatch" : "hub.awayMatch")}</Badge>
        </div>
        <div className="flex items-start gap-3">
          <TeamBlock club={ours} nameTestId="hub-club-name" />
          <span className="pt-6 text-sm text-muted uppercase">{t("hub.vs")}</span>
          <div className="flex min-w-0 flex-1" data-testid="next-match-opponent">
            <TeamBlock club={theirs} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="primary" size="lg">
            <a data-testid="play-match" href={hrefFor({ name: "match" })}>
              {t("hub.playMatch")}
            </a>
          </Button>
          <Button variant="secondary" size="lg" data-testid="quick-sim" onClick={onQuickSim}>
            {t("hub.quickSim")}
          </Button>
        </div>
      </div>
      <Comparison career={career} ours={ours} theirs={theirs} />
    </Card>
  );
}
