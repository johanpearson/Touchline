import type { Career, Player, PlayerPosition } from "../../game";
import { cn } from "../components";
import { fieldControlStyles } from "../components/field-styles";
import { useI18n } from "../i18n-provider";
import { PlayerRatingBadge } from "../player-rating-badge";
import {
  benchCandidates,
  benchEdit,
  type Candidate,
  type LineupEdit,
  slotRating,
  starterCandidates,
  starterEdit,
} from "./lineup-model";
import { ProfileLink } from "./profile-link";
import type { BenchSlot, StarterSlot } from "./slots";

function CandidateSelect(props: {
  testId: string;
  position?: string;
  label: string;
  value: string;
  candidates: readonly Candidate[];
  /** The rating and fitness of a candidate at this slot. */
  ratingOf: (player: Player) => number;
  fitnessOf: (player: Player) => number;
  onChange: (id: string) => void;
}) {
  const { t } = useI18n();
  const current = props.candidates.find(({ player }) => player.id === props.value)?.player;
  return (
    <div className="flex items-end gap-2">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-soft">
        {props.label}
        <select
          data-testid={props.testId}
          data-position={props.position}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className={cn(fieldControlStyles)}
        >
          {props.candidates.map(({ player, disabled }) => (
            <option key={player.id} value={player.id} disabled={disabled}>
              {`${player.name} (${t(`position.short.${player.position}`)})`}
            </option>
          ))}
        </select>
      </label>
      {current ? (
        <PlayerRatingBadge
          rating={props.ratingOf(current)}
          fitness={props.fitnessOf(current)}
          className="min-h-11 shrink-0 justify-center"
        />
      ) : null}
      {current ? <ProfileLink playerId={current.id} name={current.name} /> : null}
    </div>
  );
}

export type SlotListProps = {
  career: Career;
  players: readonly Player[];
  byId: ReadonlyMap<string, Player>;
  starters: readonly StarterSlot[];
  bench: readonly BenchSlot[];
  edit: (next: LineupEdit) => void;
};

/**
 * The lineup without the pitch: one select per starting slot and per bench slot. This is the keyboard and
 * screen reader route and, on phones, the default view.
 */
export function SlotList({ career, players, byId, starters, bench, edit }: SlotListProps) {
  const { t } = useI18n();
  const plan = career.squadPlan;
  const ratingAt = (position?: PlayerPosition) => (player: Player) =>
    slotRating(player, position ?? player.position, career.condition[player.id]);
  const fitnessOf = (player: Player) => Math.round(career.condition[player.id]?.fitness ?? 100);
  return (
    <div data-testid="slot-list" className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h3 className="m-0 font-heading text-lg text-text">{t("squad.starters")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {starters.map((slot) => (
            <CandidateSelect
              key={slot.player.id}
              testId={`starter-${slot.index}`}
              position={slot.line}
              label={t(`tactics.role.${slot.role}`)}
              value={slot.player.id}
              candidates={starterCandidates(players, plan, slot.player.id, slot.line)}
              ratingOf={ratingAt(slot.line)}
              fitnessOf={fitnessOf}
              onChange={(to) => edit(starterEdit(plan, slot.player.id, to))}
            />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="m-0 font-heading text-lg text-text">{t("squad.bench")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {bench.map((slot) => (
            <CandidateSelect
              key={slot.player.id}
              testId={`bench-${slot.index}`}
              label={t("squad.benchSlot", { slot: slot.index + 1 })}
              value={slot.player.id}
              candidates={benchCandidates(players, plan, slot.player.id, byId)}
              ratingOf={ratingAt()}
              fitnessOf={fitnessOf}
              onChange={(to) => edit(benchEdit(plan, slot.player.id, to))}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
