import type { ReactNode } from "react";
import type { MessageKey } from "../../i18n";
import { cn } from "../components/cn";
import { useI18n } from "../i18n-provider";
import { LOW_FITNESS } from "../plan-rows";
import { type HalfTimeEditor, playerOf } from "./half-time-model";

export type RowMark = "off" | "on" | null;

const ROW =
  "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 py-2 text-left text-text";
const PICKABLE =
  "cursor-pointer hover:bg-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function RowBody({ editor, id, mark }: { editor: HalfTimeEditor; id: string; mark: RowMark }) {
  const { t, formatNumber } = useI18n();
  const player = playerOf(editor, id);
  const condition = editor.condition[id];
  const fitness = condition?.fitness ?? 100;
  return (
    <>
      <span className="min-w-0">
        <span className="font-semibold">{player?.name}</span>{" "}
        <span className="text-soft">{player ? t(`position.short.${player.position}`) : ""}</span>
        {mark ? (
          <span className="ml-2 text-sm font-semibold text-accent">
            {t(mark === "off" ? "halfTime.mark.off" : "halfTime.mark.on")}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-sm text-soft">
        {t("squad.col.fitness")}{" "}
        <span
          data-testid={`half-time-fitness-${id}`}
          className={cn(fitness < LOW_FITNESS && "text-warn")}
        >
          {formatNumber(fitness, 0)}
        </span>{" "}
        {t("squad.col.form")}{" "}
        <span data-testid={`half-time-form-${id}`}>{formatNumber(condition?.form ?? 5, 1)}</span>
      </span>
    </>
  );
}

export type SquadSectionProps = {
  editor: HalfTimeEditor;
  title: MessageKey;
  ids: readonly string[];
  marks: Readonly<Record<string, RowMark>>;
  /** Players that can be tapped right now. */
  pickable: (id: string) => boolean;
  onPick: (id: string) => void;
};

/** The eleven or the bench with fitness and form; the players the flow asks for are buttons. */
export function SquadSection({ editor, title, ids, marks, pickable, onPick }: SquadSectionProps) {
  const { t } = useI18n();
  const row = (id: string): ReactNode => {
    const body = <RowBody editor={editor} id={id} mark={marks[id] ?? null} />;
    if (!pickable(id)) {
      return (
        <div className={cn(ROW, marks[id] && "opacity-70")} data-testid={`half-time-row-${id}`}>
          {body}
        </div>
      );
    }
    return (
      <button
        type="button"
        data-testid={`pick-${id}`}
        className={cn(ROW, PICKABLE)}
        onClick={() => onPick(id)}
      >
        {body}
      </button>
    );
  };
  return (
    <section className="flex flex-col gap-2">
      <h4 className="m-0 text-sm font-semibold uppercase tracking-wide text-soft">{t(title)}</h4>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {ids.map((id) => (
          <li key={id}>{row(id)}</li>
        ))}
      </ul>
    </section>
  );
}
