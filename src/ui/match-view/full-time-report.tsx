import { Flag } from "lucide-react";
import type { ReactNode } from "react";
import type { ActionMatchState, PerSide, Side } from "../../engine";
import { Badge } from "../components/badge";
import { Card } from "../components/card";
import { cn } from "../components/cn";
import { useI18n } from "../i18n-provider";
import { ClubCrest } from "../shell/club-crest";
import { type GoalLine, type MatchOutcome, matchOutcome } from "./match-result";

export type FullTimeReportProps = {
  names: PerSide<string>;
  colours: PerSide<string>;
  score: ActionMatchState["score"];
  userSide: Side;
  goals: readonly GoalLine[];
  /** The ratings table, shown under the headline. */
  children?: ReactNode;
};

const TONE = { win: "good", draw: "neutral", defeat: "bad" } as const;

function OutcomeBadge({ outcome }: { outcome: MatchOutcome }) {
  const { t } = useI18n();
  return (
    <Badge tone={TONE[outcome]} data-testid="match-outcome" data-outcome={outcome}>
      {t(`fullTime.${outcome}`)}
    </Badge>
  );
}

function Scorers({ side, name, goals }: { side: Side; name: string; goals: readonly GoalLine[] }) {
  const { t } = useI18n();
  const own = goals.filter((goal) => goal.side === side);
  return (
    <ul
      aria-label={t("fullTime.goalsLabel", { team: name })}
      data-testid={`scorers-${side}`}
      className={cn(
        "m-0 flex list-none flex-col gap-1 p-0 text-[15px] text-soft",
        side === "away" && "items-end text-right",
      )}
    >
      {own.map((goal) => (
        <li key={`${goal.time}-${goal.name}`} className="flex items-center gap-2">
          <Flag aria-hidden="true" className="size-3.5 text-muted" />
          <span>{goal.name}</span>
          <span className="text-muted tabular-nums">{goal.minute}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The full-time report: the result as a headline in words, both crests with the score, who scored
 * and when, then the player ratings. The outcome is text first; colour only reinforces it.
 */
export function FullTimeReport({
  names,
  colours,
  score,
  userSide,
  goals,
  children,
}: FullTimeReportProps) {
  const { t } = useI18n();
  const outcome = matchOutcome(score, userSide);
  const sides: Side[] = ["home", "away"];
  return (
    <section
      aria-label={t("fullTime.label")}
      data-testid="full-time-report"
      className="flex min-w-0 flex-col gap-4"
    >
      <Card radius="xl" padding="lg" tone="raised" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 font-heading text-3xl font-bold" data-testid="match-headline">
            {t(`fullTime.${outcome}`)}
          </h2>
          <OutcomeBadge outcome={outcome} />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          {sides.map((side) => (
            <div
              key={side}
              className={cn(
                "flex min-w-0 items-center gap-3",
                side === "away" && "order-3 flex-row-reverse text-right",
              )}
            >
              <ClubCrest
                shortName={names[side]}
                colours={{ primary: colours[side], secondary: colours[side] }}
                size={40}
                className="shrink-0"
              />
              <span className="min-w-0 truncate font-heading text-xl font-semibold">
                {names[side]}
              </span>
            </div>
          ))}
          <span
            data-testid="full-time-score"
            className="order-2 font-heading text-5xl font-bold whitespace-nowrap tabular-nums"
          >
            {score.home} – {score.away}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {sides.map((side) => (
            <Scorers key={side} side={side} name={names[side]} goals={goals} />
          ))}
        </div>
        {goals.length === 0 ? (
          <p className="m-0 text-center text-muted">{t("fullTime.noGoals")}</p>
        ) : null}
      </Card>
      {children}
    </section>
  );
}
