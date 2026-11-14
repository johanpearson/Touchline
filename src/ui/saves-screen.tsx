import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "./i18n-provider";
import { hrefFor } from "./routes";
import { isManualSlot, type SlotActionResult, type SlotEntry, type SlotError } from "./save-slots";
import { useCareer } from "./use-career";

type Pending = { id: string; action: "overwrite" | "delete" };

const ERROR_KEYS: Record<SlotError, string> = {
  store: "saves.error.store",
  corrupt: "saves.error.corrupt",
  "newer-version": "saves.error.newerVersion",
  "unknown-slot": "saves.error.other",
  "not-manual": "saves.error.other",
  "no-career": "saves.error.other",
  empty: "saves.error.other",
};

const formatTime = (iso: string, locale: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
};

export function SavesScreen() {
  const { t, locale } = useI18n();
  const { career, listSlots, saveToSlot, loadSlot, deleteSlot, lastSavedAt } = useCareer();
  const [slots, setSlots] = useState<SlotEntry[] | null>(null);
  const [listFailed, setListFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<{ id: string; error: SlotError } | null>(null);
  const focusAfter = useRef<string | null>(null);
  const lastSaved = lastSavedAt;

  const refresh = useCallback(async () => {
    const result = await listSlots();
    if (result.ok) {
      setSlots(result.slots);
      setListFailed(false);
    } else {
      setListFailed(true);
    }
  }, [listSlots]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new autosave time refreshes the rows
  useEffect(() => {
    void refresh();
  }, [refresh, lastSaved]);

  useEffect(() => {
    if (pending === null && focusAfter.current !== null) {
      document.querySelector<HTMLElement>(`[data-testid="${focusAfter.current}"]`)?.focus();
      focusAfter.current = null;
    }
  }, [pending]);

  const run = async (id: string, action: () => Promise<SlotActionResult>, onDone?: () => void) => {
    setBusy(true);
    setError(null);
    const result = await action();
    if (result.ok) onDone?.();
    else setError({ id, error: result.error });
    await refresh();
    setBusy(false);
  };

  const closeConfirm = (returnFocusTo: string) => {
    focusAfter.current = returnFocusTo;
    setPending(null);
  };

  const requestSave = (entry: SlotEntry) => {
    if (entry.state.kind === "empty") {
      void run(entry.id, () => saveToSlot(entry.id));
    } else {
      setPending({ id: entry.id, action: "overwrite" });
    }
  };

  const confirm = async (entry: SlotEntry) => {
    if (!pending) return;
    const { action } = pending;
    const trigger = `${action === "delete" ? "delete" : "save"}-${entry.id}`;
    closeConfirm(trigger);
    await run(entry.id, () => (action === "delete" ? deleteSlot(entry.id) : saveToSlot(entry.id)));
  };

  const load = (entry: SlotEntry) =>
    run(
      entry.id,
      () => loadSlot(entry.id),
      () => {
        window.location.hash = hrefFor({ name: "home" });
      },
    );

  const slotName = (id: string) =>
    isManualSlot(id)
      ? t("saves.slot.manual", { number: id.replace("slot-", "") })
      : t("saves.slot.autosave");

  return (
    <section className="saves-screen" data-testid="saves-screen">
      <h2>{t("saves.title")}</h2>
      {career ? null : (
        <p data-testid="saves-no-career">
          {t("saves.noCareer")}{" "}
          <a data-testid="saves-back" href={hrefFor({ name: "home" })}>
            {t("saves.back")}
          </a>
        </p>
      )}
      {listFailed ? (
        <p role="alert" data-testid="saves-list-error">
          {t("saves.listError")}
        </p>
      ) : null}
      <ul className="slot-list">
        {(slots ?? []).map((entry) => (
          <SlotRow
            key={entry.id}
            entry={entry}
            name={slotName(entry.id)}
            time={(iso) => formatTime(iso, locale)}
            canSave={career !== null && isManualSlot(entry.id)}
            busy={busy}
            confirming={pending?.id === entry.id ? pending.action : null}
            error={error?.id === entry.id ? error.error : null}
            onSave={() => requestSave(entry)}
            onLoad={() => void load(entry)}
            onDelete={() => setPending({ id: entry.id, action: "delete" })}
            onConfirm={() => void confirm(entry)}
            onCancel={() =>
              closeConfirm(`${pending?.action === "delete" ? "delete" : "save"}-${entry.id}`)
            }
          />
        ))}
      </ul>
    </section>
  );
}

type RowProps = {
  entry: SlotEntry;
  name: string;
  time: (iso: string) => string;
  canSave: boolean;
  busy: boolean;
  confirming: "overwrite" | "delete" | null;
  error: SlotError | null;
  onSave: () => void;
  onLoad: () => void;
  onDelete: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

function SlotRow(props: RowProps) {
  const { t } = useI18n();
  const { entry, busy, confirming, error } = props;
  const { state } = entry;
  const loadable = state.kind === "filled";
  return (
    <li className="slot-row" data-testid={`slot-${entry.id}`}>
      <strong className="slot-name">{props.name}</strong>
      <span className="slot-info" data-testid={`slot-info-${entry.id}`}>
        {state.kind === "empty" ? t("saves.empty") : null}
        {state.kind === "corrupt" ? t("saves.corrupt") : null}
        {state.kind === "newer-version" ? t("saves.newerVersion") : null}
        {state.kind === "filled"
          ? `${t("saves.details", {
              club: state.clubName,
              league: state.leagueName,
              season: state.season,
              matchday: state.matchday,
            })} · ${t("saves.savedAt", { time: props.time(state.savedAt) })}`
          : null}
      </span>
      <span className="slot-actions">
        {props.canSave && (state.kind === "empty" || state.kind === "filled") ? (
          <button
            type="button"
            data-testid={`save-${entry.id}`}
            disabled={busy}
            onClick={props.onSave}
          >
            {t("saves.save")}
          </button>
        ) : null}
        {loadable ? (
          <button
            type="button"
            data-testid={`load-${entry.id}`}
            disabled={busy}
            onClick={props.onLoad}
          >
            {t("saves.load")}
          </button>
        ) : null}
        {state.kind !== "empty" ? (
          <button
            type="button"
            data-testid={`delete-${entry.id}`}
            disabled={busy}
            onClick={props.onDelete}
          >
            {t("saves.delete")}
          </button>
        ) : null}
      </span>
      {confirming ? (
        <div
          className="slot-confirm"
          role="alertdialog"
          data-testid={confirming === "delete" ? "confirm-delete" : "confirm-overwrite"}
        >
          <span>
            {t(confirming === "delete" ? "saves.confirmDelete" : "saves.confirmOverwrite")}
          </span>
          <button type="button" data-testid="confirm-yes" disabled={busy} onClick={props.onConfirm}>
            {t("saves.confirm")}
          </button>
          <button type="button" data-testid="confirm-no" onClick={props.onCancel}>
            {t("saves.cancel")}
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="slot-error" role="alert" data-testid={`slot-error-${entry.id}`}>
          {t(ERROR_KEYS[error] as "saves.error.other")}
        </p>
      ) : null}
    </li>
  );
}
