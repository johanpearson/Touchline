import type { ActionMatchState, PerSide, Side, ZoneEvent } from "../../engine";
import { cn } from "../components/cn";
import { useI18n } from "../i18n-provider";
import { ClubCrest } from "../shell/club-crest";
import { useGoalHighlight } from "./goal-highlight";
import { formatMatchMinute } from "./match-minute";

export type ScoreboardProps = {
  homeName: string;
  awayName: string;
  /** The kit body colour each side wears. */
  homeColour: string;
  awayColour: string;
  score: ActionMatchState["score"];
  period: ActionMatchState["period"];
  matchTime: number;
  events: readonly ZoneEvent[];
};

type TeamProps = { side: Side; name: string; colour: string };

function Team({ side, name, colour }: TeamProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", side === "away" && "flex-row-reverse")}>
      <span
        aria-hidden="true"
        data-testid={`${side}-bar`}
        className="h-10 w-1.5 shrink-0 rounded-full"
        style={{ background: colour }}
      />
      <ClubCrest
        shortName={name}
        colours={{ primary: colour, secondary: colour }}
        size={36}
        className="shrink-0"
      />
      <span
        data-testid={`${side}-name`}
        title={name}
        className="min-w-0 truncate font-heading text-xl font-semibold sm:text-2xl"
      >
        {name}
      </span>
    </div>
  );
}

/**
 * Both clubs with crest and the kit colour they wear, the score, the clock and the period. A goal
 * highlights the scoreboard for a few seconds with a static ring (a soft pulse only when motion is
 * allowed) and is announced politely, so it is communicated with reduced motion too.
 */
export function Scoreboard({
  homeName,
  awayName,
  homeColour,
  awayColour,
  score,
  period,
  matchTime,
  events,
}: ScoreboardProps) {
  const { t } = useI18n();
  const goal = useGoalHighlight(score);
  const names: PerSide<string> = { home: homeName, away: awayName };
  return (
    <section
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-line bg-surface p-3 sm:gap-6 sm:p-4",
        goal && "ring-2 ring-accent motion-safe:animate-pulse",
      )}
      aria-label={t("scoreboard.label")}
      data-testid="scoreboard"
      data-goal={goal?.side}
    >
      <Team side="home" name={homeName} colour={homeColour} />
      <div className="flex shrink-0 flex-col items-center">
        <span
          data-testid="score"
          className="whitespace-nowrap font-heading text-4xl font-bold tabular-nums sm:text-5xl"
        >
          {score.home} – {score.away}
        </span>
        <span className="flex gap-2 text-[13px] text-muted tabular-nums">
          <span data-testid="clock">{formatMatchMinute(matchTime, events)}</span>
          <span data-testid="period">{t(`period.${period}`)}</span>
        </span>
      </div>
      <Team side="away" name={awayName} colour={awayColour} />
      <p className="sr-only" role="status" data-testid="goal-announcement">
        {goal
          ? t("match.goal.announce", {
              team: names[goal.side],
              home: homeName,
              homeGoals: goal.score.home,
              away: awayName,
              awayGoals: goal.score.away,
            })
          : ""}
      </p>
    </section>
  );
}
