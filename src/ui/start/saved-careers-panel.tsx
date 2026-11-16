import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState, Skeleton } from "../components";
import { useI18n } from "../i18n-provider";
import { ImportControls } from "../import-controls";
import { hrefFor } from "../routes";
import type { SlotEntry, SlotError } from "../save-slots";
import { KitIcon } from "../shell/kit-icon";
import { useCareer } from "../use-career";
import { describeSavedRow } from "./describe-save";
import { SLOT_ERROR_KEYS } from "./slot-error-keys";

const slotName = (id: string, t: ReturnType<typeof useI18n>["t"]): string =>
  id === "autosave"
    ? t("saves.slot.autosave")
    : t("saves.slot.manual", { number: id.replace(/\D+/g, "") });

type RowProps = {
  entry: SlotEntry;
  nowIso: string;
  busy: string | null;
  onLoad: (id: string) => void;
};

function SavedRow({ entry, nowIso, busy, onLoad }: RowProps) {
  const { t, locale } = useI18n();
  const { state } = entry;
  if (state.kind === "empty") return null;
  const name = slotName(entry.id, t);
  if (state.kind !== "filled") {
    return (
      <li data-testid={`saved-${entry.id}`} className="flex flex-col rounded-md p-1">
        <strong className="font-semibold">
          {t(state.kind === "corrupt" ? "saves.corrupt" : "saves.newerVersion")}
        </strong>
        <span className="text-[13px] text-muted">{name}</span>
      </li>
    );
  }
  return (
    <li data-testid={`saved-${entry.id}`} className="flex items-center gap-3 rounded-md p-1">
      <KitIcon kit={state.kit} size={38} className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col">
        <strong className="truncate font-semibold">{state.clubName}</strong>
        <span className="text-[13px] text-muted">
          {name} · {describeSavedRow(t, locale, state, nowIso)}
        </span>
      </span>
      <Button
        data-testid={`start-load-${entry.id}`}
        disabled={busy !== null && busy !== entry.id}
        loading={busy === entry.id}
        loadingLabel={t("start.continue.loading")}
        onClick={() => onLoad(entry.id)}
      >
        {t("start.load.action")}
      </Button>
    </li>
  );
}

type SavedListProps = {
  slots: SlotEntry[] | null;
  failed: boolean;
  nowIso: string;
  busy: string | null;
  onLoad: (id: string) => void;
};

/** The states of the list: loading, unreadable, empty, or the saved rows. */
function SavedList({ slots, failed, nowIso, busy, onLoad }: SavedListProps) {
  const { t } = useI18n();
  if (failed) {
    return (
      <p className="m-0 text-bad" role="alert" data-testid="saved-list-error">
        {t("saves.listError")}
      </p>
    );
  }
  if (slots === null) {
    return (
      <div role="status" aria-label={t("start.load.loading")} className="flex flex-col gap-2">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
    );
  }
  const rows = slots.filter((entry) => entry.state.kind !== "empty");
  if (rows.length === 0) {
    return (
      <EmptyState
        data-testid="saved-empty"
        className="px-2 py-6"
        title={t("start.load.emptyTitle")}
        text={t("start.load.emptyText")}
      />
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {rows.map((entry) => (
        <SavedRow key={entry.id} entry={entry} nowIso={nowIso} busy={busy} onLoad={onLoad} />
      ))}
    </ul>
  );
}

/** Reads the slots once; `failed` when the storage cannot describe them. */
function useSavedSlots() {
  const { listSlots } = useCareer();
  const [slots, setSlots] = useState<SlotEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void listSlots().then((result) => {
      if (cancelled) return;
      if (result.ok) setSlots(result.slots);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [listSlots]);
  return { slots, failed };
}

/** The saved careers (autosave and manual slots) with Load, and the way to import a save file. */
export function SavedCareersPanel({ id, nowIso }: { id: string; nowIso: string }) {
  const { t } = useI18n();
  const { loadSlot } = useCareer();
  const { slots, failed } = useSavedSlots();
  const [busy, setBusy] = useState<string | null>(null);
  const [failure, setFailure] = useState<SlotError | null>(null);

  const load = useCallback(
    async (slotId: string) => {
      setBusy(slotId);
      setFailure(null);
      const result = await loadSlot(slotId);
      if (result.ok) {
        window.location.hash = hrefFor({ name: "home" });
        return;
      }
      setFailure(result.error);
      setBusy(null);
    },
    [loadSlot],
  );

  return (
    <section
      id={id}
      aria-label={t("start.load.title")}
      data-testid="saved-careers"
      className="flex w-full max-w-[440px] flex-col gap-2 rounded-xl border border-line bg-surface p-4"
    >
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="m-0 font-heading text-[22px] font-semibold">{t("start.load.title")}</h2>
        <span className="text-[13px] text-muted">{t("start.load.hint")}</span>
      </div>
      <SavedList slots={slots} failed={failed} nowIso={nowIso} busy={busy} onLoad={load} />
      {failure ? (
        <p className="m-0 text-bad" role="alert" data-testid="load-failure">
          {t(SLOT_ERROR_KEYS[failure])}
        </p>
      ) : null}
      <ImportControls
        label={t("start.import")}
        buttonClassName="mt-2 w-full border-dashed bg-transparent text-muted"
        onPicked={() => {
          window.location.hash = hrefFor({ name: "saves" });
        }}
      />
    </section>
  );
}
