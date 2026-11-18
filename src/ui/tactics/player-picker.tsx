import type { Player } from "../../game";
import { Drawer } from "../components";
import { useI18n } from "../i18n-provider";
import { PlayerRatingBadge } from "../player-rating-badge";
import type { Candidate } from "./lineup-model";
import { ProfileLink } from "./profile-link";

export type PickerState = {
  title: string;
  hint: string;
  currentId: string;
  candidates: readonly Candidate[];
  /** Status of every squad player in the plan, to tell starters from bench players. */
  statusOf: (player: Player) => "starter" | "bench" | "out";
  /** Whether a disabled candidate is locked by the bench keeper rule rather than by starting. */
  keeperLocked: (candidate: Candidate) => boolean;
  /** The rating at the slot being filled (effective, as the engine uses it). */
  ratingOf: (player: Player) => number;
  fitnessOf: (id: string) => number;
  formOf: (id: string) => number;
  onChoose: (id: string) => void;
};

function PickerOption({ state, candidate }: { state: PickerState; candidate: Candidate }) {
  const { t, formatNumber } = useI18n();
  const { player } = candidate;
  const current = player.id === state.currentId;
  const status = state.statusOf(player);
  const note = current
    ? t("tactics.picker.current")
    : status === "out"
      ? ""
      : t(`squad.status.${status}`);
  const locked = candidate.disabled && state.keeperLocked(candidate);
  return (
    <li className="flex items-center gap-2">
      <button
        type="button"
        data-testid={`picker-option-${player.id}`}
        disabled={candidate.disabled}
        aria-current={current ? "true" : undefined}
        onClick={() => state.onChoose(player.id)}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 rounded-md border border-line bg-surface px-3 py-2 text-left text-text hover:bg-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 aria-[current=true]:border-accent"
      >
        <span className="font-semibold">
          {player.name}{" "}
          <span className="font-normal text-soft">{t(`position.short.${player.position}`)}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-soft">
          <PlayerRatingBadge
            rating={state.ratingOf(player)}
            fitness={state.fitnessOf(player.id)}
            layout="inline"
          />
          <span>
            {t("tactics.option.form", { value: formatNumber(state.formOf(player.id), 1) })}
          </span>
        </span>
        <span className="text-sm text-muted">
          {note}
          {locked ? t("tactics.option.keeperLocked") : null}
        </span>
      </button>
      <ProfileLink playerId={player.id} name={player.name} />
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
