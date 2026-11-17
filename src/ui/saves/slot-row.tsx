import { Button, Card } from "../components";
import { useI18n } from "../i18n-provider";
import type { SlotEntry, SlotError } from "../save-slots";
import { KitIcon } from "../shell/kit-icon";
import { FALLBACK_KIT } from "../start/fallback-kit";
import { SLOT_ERROR_KEYS } from "../start/slot-error-keys";
import { formatSavedTime } from "./slot-label";

export type SlotRowProps = {
  entry: SlotEntry;
  name: string;
  canSave: boolean;
  busy: boolean;
  highlighted: boolean;
  error: SlotError | null;
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
  onDelete: () => void;
};

function SlotInfo({ entry }: Pick<SlotRowProps, "entry">) {
  const { t, locale } = useI18n();
  const { state } = entry;
  if (state.kind === "filled") {
    return (
      <span className="flex min-w-0 flex-col" data-testid={`slot-info-${entry.id}`}>
        <strong
          className="truncate font-heading text-xl font-semibold"
          data-testid={`slot-club-${entry.id}`}
        >
          {state.clubName}
        </strong>
        <span className="text-[13px] text-soft">
          {state.leagueName}
          {" · "}
          {t("saves.rowDetails", { season: state.season, matchday: state.matchday })}
        </span>
        <span className="text-[13px] text-muted">
          {t("saves.savedAt", { time: formatSavedTime(state.savedAt, locale) })}
        </span>
      </span>
    );
  }
  const key =
    state.kind === "empty"
      ? "saves.empty"
      : state.kind === "corrupt"
        ? "saves.corrupt"
        : "saves.newerVersion";
  return (
    <span
      className={state.kind === "empty" ? "text-muted" : "font-semibold text-bad"}
      data-testid={`slot-info-${entry.id}`}
    >
      {t(key)}
    </span>
  );
}

function SlotActions(props: SlotRowProps) {
  const { t } = useI18n();
  const { entry, busy } = props;
  const kind = entry.state.kind;
  const fillable = kind === "empty" || kind === "filled";
  return (
    <div className="flex flex-wrap gap-2">
      {props.canSave && fillable ? (
        <Button
          variant={kind === "empty" ? "primary" : "secondary"}
          data-testid={`save-${entry.id}`}
          disabled={busy}
          onClick={props.onSave}
        >
          {t("saves.save")}
        </Button>
      ) : null}
      {kind === "filled" ? (
        <>
          <Button data-testid={`load-${entry.id}`} disabled={busy} onClick={props.onLoad}>
            {t("saves.load")}
          </Button>
          <Button data-testid={`export-${entry.id}`} disabled={busy} onClick={props.onExport}>
            {t("saves.export")}
          </Button>
        </>
      ) : null}
      {kind !== "empty" ? (
        <Button
          variant="destructive"
          data-testid={`delete-${entry.id}`}
          disabled={busy}
          onClick={props.onDelete}
        >
          {t("saves.delete")}
        </Button>
      ) : null}
    </div>
  );
}

/** One slot as a card: kit swatch, club and progress, and the actions that fit its state. */
export function SlotRow(props: SlotRowProps) {
  const { t } = useI18n();
  const { entry, error } = props;
  const kit = entry.state.kind === "filled" ? entry.state.kit : FALLBACK_KIT;
  return (
    <li
      className="list-none"
      data-testid={`slot-${entry.id}`}
      data-highlighted={props.highlighted ? "true" : undefined}
    >
      <Card
        className={`flex flex-col gap-3 sm:flex-row sm:items-center ${props.highlighted ? "border-accent" : ""}`}
      >
        <KitIcon
          kit={kit}
          size={44}
          className={`shrink-0 ${entry.state.kind === "filled" ? "" : "opacity-40"}`}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[13px] font-semibold text-muted uppercase">{props.name}</span>
          <SlotInfo entry={entry} />
        </div>
        <SlotActions {...props} />
      </Card>
      {error ? (
        <p
          className="m-0 mt-1 px-2 text-[13px] text-bad"
          role="alert"
          data-testid={`slot-error-${entry.id}`}
        >
          {t(SLOT_ERROR_KEYS[error])}
        </p>
      ) : null}
    </li>
  );
}
