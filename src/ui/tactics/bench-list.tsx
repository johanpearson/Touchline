import { useI18n } from "../i18n-provider";
import { LOW_FITNESS } from "../plan-rows";
import type { BenchSlot } from "./slots";

/** The bench as a list of buttons; each opens the same picker as a pitch slot. */
export function BenchList(props: { slots: readonly BenchSlot[]; onPick: (index: number) => void }) {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-3">
      <h3 className="m-0 font-heading text-lg text-text">{t("tactics.bench.label")}</h3>
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        {props.slots.map((slot) => (
          <li key={slot.player.id}>
            <button
              type="button"
              data-testid={`bench-slot-${slot.index}`}
              data-position={slot.player.position}
              aria-haspopup="dialog"
              aria-label={t("tactics.bench.slot", {
                slot: slot.index + 1,
                player: slot.player.name,
                position: t(`position.${slot.player.position}`),
                fitness: slot.fitness,
              })}
              onClick={() => props.onPick(slot.index)}
              className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 text-left text-text hover:bg-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <span className="min-w-0 truncate font-semibold">
                {slot.player.name}{" "}
                <span className="font-normal text-soft">
                  {t(`position.short.${slot.player.position}`)}
                </span>
              </span>
              <span className="shrink-0 text-sm text-soft">
                {slot.fitness < LOW_FITNESS ? `${t("squad.lowFitness")} ` : ""}
                {slot.fitness}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
