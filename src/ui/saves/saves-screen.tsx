import { useEffect, useRef, useState } from "react";
import { Button, Card, ConfirmDialog, Skeleton } from "../components";
import { useI18n } from "../i18n-provider";
import { ImportControls } from "../import-controls";
import { hrefFor } from "../routes";
import { isManualSlot, type SlotEntry } from "../save-slots";
import { useCareer } from "../use-career";
import { confirmTexts, type PendingAction } from "./confirm-texts";
import { ImportPicker } from "./import-picker";
import { slotLabel } from "./slot-label";
import { SlotRow } from "./slot-row";
import { useSlotList } from "./use-slot-list";
import { useSlotRunner } from "./use-slot-runner";

/** Focus goes back to the button that opened the dialog; the dialog has no trigger element. */
function useFocusReturn(open: boolean) {
  const target = useRef<string | null>(null);
  useEffect(() => {
    if (open || target.current === null) return;
    document.querySelector<HTMLElement>(`[data-testid="${target.current}"]`)?.focus();
    target.current = null;
  }, [open]);
  return (testId: string) => {
    target.current = testId;
  };
}

function NoCareerNote() {
  const { t } = useI18n();
  return (
    <p className="m-0 text-soft" data-testid="saves-no-career">
      {t("saves.noCareer")}{" "}
      <a
        data-testid="saves-back"
        className="text-accent underline"
        href={hrefFor({ name: "home" })}
      >
        {t("saves.back")}
      </a>
    </p>
  );
}

function SlotListSkeleton() {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={t("saves.loading")} className="flex flex-col gap-3">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}

export function SavesScreen() {
  const { t } = useI18n();
  const career = useCareer();
  const { slots, failed, refresh } = useSlotList();
  const { run, busy, error } = useSlotRunner(refresh);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const returnFocusTo = useFocusReturn(pending !== null);

  const closeConfirm = (testId: string) => {
    returnFocusTo(testId);
    setPending(null);
  };

  const confirm = async () => {
    if (!pending) return;
    const { id, action } = pending;
    const name = slotLabel(id, t);
    closeConfirm(confirmTexts(pending, t).returnTestId);
    if (action === "delete") {
      await run(id, () => career.deleteSlot(id), {
        success: t("saves.toast.deleted", { slot: name }),
      });
    } else if (action === "import") {
      await run(id, () => career.importInto(id), {
        success: t("saves.toast.imported", { slot: name }),
      });
    } else {
      await run(id, () => career.saveToSlot(id), {
        success: t("saves.toast.saved", { slot: name }),
      });
    }
  };

  const save = (entry: SlotEntry) =>
    entry.state.kind === "empty"
      ? run(entry.id, () => career.saveToSlot(entry.id), {
          success: t("saves.toast.saved", { slot: slotLabel(entry.id, t) }),
        })
      : setPending({ id: entry.id, action: "overwrite" });

  const chooseImportTarget = (entry: SlotEntry) =>
    entry.state.kind === "empty"
      ? run(entry.id, () => career.importInto(entry.id), {
          success: t("saves.toast.imported", { slot: slotLabel(entry.id, t) }),
        })
      : setPending({ id: entry.id, action: "import" });

  const load = (entry: SlotEntry) =>
    run(entry.id, () => career.loadSlot(entry.id), {
      onDone: () => {
        window.location.hash = hrefFor({ name: "home" });
      },
    });

  const exportSlot = (entry: SlotEntry) =>
    run(entry.id, () => career.exportSlot(entry.id), {
      success: t("saves.toast.exported", { slot: slotLabel(entry.id, t) }),
    });

  const exportRunning = () =>
    run("career", async () => career.exportCareer(), { success: t("saves.toast.exportedCareer") });

  const dialog = pending ? confirmTexts(pending, t) : null;

  return (
    <section data-testid="saves-screen" className="flex max-w-[860px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-heading text-[40px] leading-none font-bold">{t("saves.title")}</h1>
        <p className="m-0 text-muted">{t("saves.hint")}</p>
      </div>
      {career.career ? null : <NoCareerNote />}
      <Card className="flex flex-wrap items-start gap-3">
        <ImportControls />
        {career.career ? (
          <Button data-testid="export-career" onClick={() => void exportRunning()}>
            {t("saves.exportCareer")}
          </Button>
        ) : null}
      </Card>
      {career.importOffer ? (
        <ImportPicker
          slots={slots ?? []}
          busy={busy}
          onChoose={(entry) => void chooseImportTarget(entry)}
          onCancel={() => {
            setPending(null);
            career.cancelImport();
          }}
        />
      ) : null}
      {failed ? (
        <p className="m-0 text-bad" role="alert" data-testid="saves-list-error">
          {t("saves.listError")}
        </p>
      ) : null}
      {slots === null && !failed ? <SlotListSkeleton /> : null}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {(slots ?? []).map((entry) => (
          <SlotRow
            key={entry.id}
            entry={entry}
            name={slotLabel(entry.id, t)}
            canSave={career.career !== null && isManualSlot(entry.id)}
            busy={busy}
            highlighted={career.lastImportedSlot === entry.id}
            error={error?.id === entry.id ? error.error : null}
            onSave={() => void save(entry)}
            onLoad={() => void load(entry)}
            onExport={() => void exportSlot(entry)}
            onDelete={() => setPending({ id: entry.id, action: "delete" })}
          />
        ))}
      </ul>
      {dialog && pending ? (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) closeConfirm(dialog.returnTestId);
          }}
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={t("saves.cancel")}
          closeLabel={t("shell.close")}
          destructive
          busy={busy}
          confirmTestId={pending.action === "import" ? "import-confirm-yes" : "confirm-yes"}
          onConfirm={() => void confirm()}
        />
      ) : null}
    </section>
  );
}
