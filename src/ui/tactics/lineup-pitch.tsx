import { TriangleAlert } from "lucide-react";
import type { Kit } from "../../game";
import { useI18n } from "../i18n-provider";
import { LOW_FITNESS } from "../plan-rows";
import { KitIcon } from "../shell/kit-icon";
import { type StarterSlot, surname } from "./slots";

/** Text and lines on the stage use fixed light values (4.5:1 or better on every theme's stage). */
const STAGE_TEXT = "text-[#e8edf7]";
const STAGE_MUTED = "text-[#c3cce0]";

function PitchLines() {
  return (
    <svg
      viewBox="0 0 100 125"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
      fill="none"
      stroke="#e8edf7"
      strokeOpacity="0.28"
      strokeWidth="0.5"
    >
      <rect x="4" y="4" width="92" height="117" />
      <path d="M36 4a14 14 0 0 0 28 0" />
      <rect x="22" y="91" width="56" height="30" />
      <rect x="38" y="109" width="24" height="12" />
      <path d="M40 91a14 14 0 0 1 20 0" />
    </svg>
  );
}

function SlotButton(props: { slot: StarterSlot; kit: Kit; onPick: (index: number) => void }) {
  const { t } = useI18n();
  const { slot } = props;
  const role = t(`tactics.role.${slot.role}`);
  return (
    <button
      type="button"
      data-testid={`pitch-slot-${slot.index}`}
      data-position={slot.line}
      aria-haspopup="dialog"
      aria-label={t("tactics.slot.label", {
        role,
        player: slot.player.name,
        fitness: slot.fitness,
      })}
      onClick={() => props.onPick(slot.index)}
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
      className={`absolute flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center gap-px rounded-md border-0 bg-transparent px-1 py-0.5 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd27a] ${STAGE_TEXT}`}
    >
      <KitIcon kit={props.kit} size={30} />
      <span className="max-w-[4.5rem] truncate text-xs font-semibold" title={slot.player.name}>
        {surname(slot.player.name)}
      </span>
      <span className={`inline-flex items-center gap-0.5 text-xs ${STAGE_MUTED}`}>
        {slot.fitness < LOW_FITNESS ? (
          <TriangleAlert aria-hidden="true" className="size-3 text-[#ffd27a]" />
        ) : null}
        {slot.fitness}
      </span>
    </button>
  );
}

export type LineupPitchProps = {
  slots: readonly StarterSlot[];
  /** The home kit of the user's club. */
  kit: Kit;
  onPick: (index: number) => void;
};

/** The starting eleven drawn in formation on the dark stage; every slot is a button that names the role and the player. */
export function LineupPitch({ slots, kit, onPick }: LineupPitchProps) {
  const { t } = useI18n();
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset cannot be a positioned, aspect-ratio box in every browser; the group only names the pitch
    <div
      role="group"
      aria-label={t("tactics.pitch.label")}
      data-testid="lineup-pitch"
      className="relative aspect-[4/5] w-full max-w-[34rem] overflow-hidden rounded-xl border border-line"
      style={{ background: "radial-gradient(circle at 50% 35%, var(--stage-glow), var(--stage))" }}
    >
      <PitchLines />
      {slots.map((slot) => (
        <SlotButton key={slot.index} slot={slot} kit={kit} onPick={onPick} />
      ))}
    </div>
  );
}
