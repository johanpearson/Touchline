import type { Career, Player } from "../../game";
import { cn } from "../components";
import { fieldControlStyles } from "../components/field-styles";
import { useI18n } from "../i18n-provider";
import {
  benchCandidates,
  benchEdit,
  type Candidate,
  type LineupEdit,
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
              onChange={(to) => edit(benchEdit(plan, slot.player.id, to))}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
