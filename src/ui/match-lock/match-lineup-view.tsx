import type { Career } from "../../game";
import type { MessageKey } from "../../i18n";
import { useI18n } from "../i18n-provider";
import { PlayerRatingBadge } from "../player-rating-badge";
import { RatingsPanel } from "../tactics/ratings-panel";
import { benchSlots, starterSlots } from "../tactics/slots";
import { squadPlayers } from "../tactics/use-lineup-edit";
import { TACTIC_NAMES } from "../tactics-editor";

type Row = { id: string; label: string; name: string; rating: number; fitness: number };

function Rows({ title, rows, testId }: { title: string; rows: readonly Row[]; testId: string }) {
  return (
    <section className="flex flex-col gap-2" data-testid={testId}>
      <h3 className="m-0 font-heading text-lg text-text">{title}</h3>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-line bg-surface px-3"
          >
            <span className="min-w-0 truncate">
              <span className="text-sm text-muted">{row.label}</span>{" "}
              <span className="font-semibold text-text">{row.name}</span>
            </span>
            <PlayerRatingBadge
              rating={row.rating}
              fitness={row.fitness}
              layout="inline"
              className="shrink-0"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The lineup and tactics of the user's side as they play the match, to read: formation, starters,
 * bench, the four tactic settings and the team ratings. Nothing here changes the plan.
 */
export function MatchLineupView({ career }: { career: Career }) {
  const { t } = useI18n();
  const players = squadPlayers(career);
  const byId = new Map(players.map((p) => [p.id, p]));
  const plan = career.squadPlan;
  const starters = starterSlots(career, byId).map(
    (slot): Row => ({
      id: slot.player.id,
      label: t(`tactics.role.${slot.role}`),
      name: slot.player.name,
      rating: slot.rating,
      fitness: slot.fitness,
    }),
  );
  const bench = benchSlots(career, byId).map(
    (slot): Row => ({
      id: slot.player.id,
      label: t(`position.short.${slot.player.position}`),
      name: slot.player.name,
      rating: slot.rating,
      fitness: slot.fitness,
    }),
  );
  return (
    <div data-testid="match-lineup-view" className="flex flex-col gap-4">
      <p className="m-0 text-muted" data-testid="match-lineup-formation">
        {t("squad.formation")}: {plan.formation}
      </p>
      <Rows title={t("squad.starters")} rows={starters} testId="match-lineup-starters" />
      <Rows title={t("squad.bench")} rows={bench} testId="match-lineup-bench" />
      <section className="flex flex-col gap-2">
        <h3 className="m-0 font-heading text-lg text-text">{t("squad.tactics")}</h3>
        <dl data-testid="match-lineup-tactics" className="m-0 grid grid-cols-2 gap-2">
          {TACTIC_NAMES.map((name) => (
            <div key={name} className="rounded-md border border-line bg-sunk px-3 py-2">
              <dt className="text-xs text-muted">{t(`squad.tactic.${name}`)}</dt>
              <dd className="m-0 font-semibold text-text" data-testid={`match-tactic-${name}`}>
                {t(`squad.level.${plan.tactics[name]}` as MessageKey)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="m-0 font-heading text-lg text-text">{t("squad.ratings")}</h3>
        <RatingsPanel career={career} players={players} />
      </section>
    </div>
  );
}
