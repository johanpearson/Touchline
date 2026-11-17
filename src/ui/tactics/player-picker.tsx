import { type Player, playerOverall } from "../../game";
import { Drawer } from "../components";
import { useI18n } from "../i18n-provider";
import { LOW_FITNESS } from "../plan-rows";
import type { Candidate } from "./lineup-model";

export type PickerState = {
  title: string;
  hint: string;
  currentId: string;
  candidates: readonly Candidate[];
  /** Status of every squad player in the plan, to tell starters from bench players. */
  statusOf: (player: Player) => "starter" | "bench" | "out";
  /** Whether a disabled candidate is locked by the bench keeper rule rather than by starting. */
  keeperLocked: (candidate: Candidate) => boolean;
  fitnessOf: (id: string) => number;
  formOf: (id: string) => number;
  onChoose: (id: string) => void;
};

function PickerOption({ state, candidate }: { state: PickerState; candidate: Candidate }) {
  const { t, formatNumber } = useI18n();
  const { player } = candidate;
  const current = player.id === state.currentId;
  const status = state.statusOf(player);
  const fitness = state.fitnessOf(player.id);
  const note = current
    ? t("tactics.picker.current")
    : status === "out"
      ? ""
      : t(`squad.status.${status}`);
  const locked = candidate.disabled && state.keeperLocked(candidate);
  return (
    <li>
      <button
        type="button"
        data-testid={`picker-option-${player.id}`}
        disabled={candidate.disabled}
        aria-current={current ? "true" : undefined}
        onClick={() => state.onChoose(player.id)}
        className="flex min-h-11 w-full cursor-pointer flex-col items-start gap-0.5 rounded-md border border-line bg-surface px-3 py-2 text-left text-text hover:bg-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 aria-[current=true]:border-accent"
      >
        <span className="font-semibold">
          {player.name}{" "}
          <span className="font-normal text-soft">{t(`position.short.${player.position}`)}</span>
        </span>
        <span className="text-sm text-soft">
          {t("squad.col.overall")} {formatNumber(playerOverall(player), 0)} ·{" "}
          {t("tactics.option.fitness", { value: fitness })}
          {fitness < LOW_FITNESS ? ` (${t("squad.lowFitness")})` : ""} ·{" "}
          {t("tactics.option.form", { value: formatNumber(state.formOf(player.id), 1) })}
        </span>
        <span className="text-sm text-muted">
          {note}
          {locked ? t("tactics.option.keeperLocked") : null}
        </span>
      </button>
    </li>
  );
}

/**
 * Chooses the player for one slot: a side sheet on tablet and desktop, a bottom sheet on phones. Lists
 * only the players the slot accepts, with fitness and form; players who cannot be chosen are shown dimmed
 * with the reason.
 */
export function PlayerPicker(props: { state: PickerState | null; onClose: () => void }) {
  const { t } = useI18n();
  const { state } = props;
  return (
    <Drawer
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
      title={state?.title ?? ""}
      description={state?.hint}
      closeLabel={t("tactics.picker.close")}
    >
      {state ? (
        <ul data-testid="player-picker" className="m-0 flex list-none flex-col gap-2 p-0">
          {state.candidates.map((candidate) => (
            <PickerOption key={candidate.player.id} state={state} candidate={candidate} />
          ))}
        </ul>
      ) : null}
    </Drawer>
  );
}
