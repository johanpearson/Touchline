import { TriangleAlert } from "lucide-react";
import type { SquadPlan } from "../../game";
import { Card } from "../components";
import { useI18n } from "../i18n-provider";
import { TACTIC_NAMES } from "../tactics-editor";
import type { LineupEntry } from "./pre-match-model";

function PlayerRow({ entry, testId }: { entry: LineupEntry; testId: string }) {
  const { t } = useI18n();
  const { player, position, fitness, form, lowFitness } = entry;
  return (
    <li
      data-testid={testId}
      data-player-id={player.id}
      className="flex min-h-11 items-center gap-3 py-1.5"
    >
      <span className="w-10 shrink-0 text-[13px] font-semibold text-muted">
        {t(`position.short.${position}`)}
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold text-text">{player.name}</span>
      <span className="flex shrink-0 items-center gap-3 text-sm text-soft tabular-nums">
        {lowFitness ? (
          <span className="flex items-center gap-1 text-warn" data-testid="low-fitness">
            <TriangleAlert aria-hidden="true" size={14} />
            {t("squad.lowFitness")}
          </span>
        ) : null}
        <span>{t("tactics.option.fitness", { value: fitness })}</span>
        <span>{t("tactics.option.form", { value: form })}</span>
      </span>
    </li>
  );
}

type ListProps = { title: string; entries: readonly LineupEntry[]; testId: string };

function PlayerList({ title, entries, testId }: ListProps) {
  return (
    <section className="flex flex-col gap-1" data-testid={testId}>
      <h3 className="m-0 font-heading text-lg text-text">{title}</h3>
      <ul className="m-0 list-none divide-y divide-line p-0">
        {entries.map((entry, index) => (
          <PlayerRow key={entry.player.id} entry={entry} testId={`${testId}-${index}`} />
        ))}
      </ul>
    </section>
  );
}

function TacticsSummary({ plan }: { plan: SquadPlan }) {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-2" data-testid="pre-match-tactics">
      <h3 className="m-0 font-heading text-lg text-text">{t("squad.tactics")}</h3>
      <dl className="m-0 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-line bg-sunk px-3 py-2">
          <dt className="text-xs text-muted">{t("squad.formation")}</dt>
          <dd className="m-0 font-semibold text-text" data-testid="pre-match-formation">
            {plan.formation}
          </dd>
        </div>
        {TACTIC_NAMES.map((name) => (
          <div key={name} className="rounded-md border border-line bg-sunk px-3 py-2">
            <dt className="text-xs text-muted">{t(`squad.tactic.${name}`)}</dt>
            <dd className="m-0 font-semibold text-text" data-testid={`pre-match-tactic-${name}`}>
              {t(`squad.level.${plan.tactics[name]}`)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type LineupProps = {
  starters: readonly LineupEntry[];
  bench: readonly LineupEntry[];
  plan: SquadPlan;
};

/** The user's eleven in formation order, the bench and a summary of the tactics, all read-only. */
export function PreMatchLineup({ starters, bench, plan }: LineupProps) {
  const { t } = useI18n();
  return (
    <Card className="flex flex-col gap-4" data-testid="pre-match-lineup">
      <PlayerList title={t("squad.starters")} entries={starters} testId="pre-match-starter" />
      <PlayerList title={t("squad.bench")} entries={bench} testId="pre-match-bench" />
      <TacticsSummary plan={plan} />
    </Card>
  );
}
