import type { ReactNode } from "react";
import type { PlayerPosition } from "../../game";
import type { MessageKey } from "../../i18n";
import { cn } from "../components/cn";
import { useI18n } from "../i18n-provider";
import { PlayerRatingBadge } from "../player-rating-badge";
import { type ChangesEditor, energyOf, playerOf, ratingAt } from "./half-time-model";

export type RowMark = "off" | "on" | null;

const ROW =
  "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 py-2 text-left text-text";
const PICKABLE =
  "cursor-pointer hover:bg-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

type RowBodyProps = {
  editor: ChangesEditor;
  id: string;
  mark: RowMark;
  /** The position the rating is for; the player's own when absent. */
  position: PlayerPosition;
  /** True when this is not the player's own position, so the row says where he would play. */
  asPosition: boolean;
  /** True when a pending formation change moves the player to another position. */
  moved: boolean;
};

function RowBody({ editor, id, mark, position, asPosition, moved }: RowBodyProps) {
  const { t, formatNumber } = useI18n();
  const player = playerOf(editor, id);
  return (
    <>
      <span className="min-w-0">
        <span className="font-semibold">{player?.name}</span>{" "}
        <span className="text-soft" data-testid={`row-position-${id}`}>
          {asPosition
            ? t("changes.playsAs", { position: t(`position.short.${position}`) })
            : t(`position.short.${position}`)}
        </span>
        {moved ? (
          <span
            className="ml-2 rounded-pill border border-accent px-2 text-sm font-semibold text-text"
            data-testid={`row-moved-${id}`}
          >
            {t("changes.mark.moved")}
          </span>
        ) : null}
        {mark ? (
          <span className="ml-2 rounded-pill border border-accent px-2 text-sm font-semibold text-text">
            {t(mark === "off" ? "halfTime.mark.off" : "halfTime.mark.on")}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-3 text-sm text-soft">
        <PlayerRatingBadge
          rating={ratingAt(editor, id, position)}
          fitness={energyOf(editor, id)}
          layout="inline"
        />
        <span className="sr-only">
          {t("squad.col.form")} {formatNumber(editor.condition[id]?.form ?? 5, 1)}
        </span>
      </span>
    </>
  );
}

export type SquadSectionProps = {
  editor: ChangesEditor;
  title: MessageKey;
  ids: readonly string[];
  marks: Readonly<Record<string, RowMark>>;
  /** The position each row is rated at. */
  positionOf: (id: string) => PlayerPosition;
  /** Whether a row's position differs from the player's own and should be named. */
  asPosition?: (id: string) => boolean;
  /** Whether a pending formation change moves a row's player to another position. */
  moved?: (id: string) => boolean;
  /** Players that can be tapped right now. */
  pickable: (id: string) => boolean;
  onPick: (id: string) => void;
};

/** The eleven or the bench with rating and energy; the players the flow asks for are buttons. */
export function SquadSection(props: SquadSectionProps) {
  const { editor, title, ids, marks, positionOf, pickable, onPick } = props;
  const { t } = useI18n();
  const row = (id: string): ReactNode => {
    const body = (
      <RowBody
        editor={editor}
        id={id}
        mark={marks[id] ?? null}
        position={positionOf(id)}
        asPosition={props.asPosition?.(id) ?? false}
        moved={props.moved?.(id) ?? false}
      />
    );
    if (!pickable(id)) {
      return (
        <div className={ROW} data-testid={`half-time-row-${id}`}>
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
