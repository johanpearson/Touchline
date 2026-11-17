import { Button, Card, Skeleton } from "../components";
import { useI18n } from "../i18n-provider";
import { ImportControls } from "../import-controls";
import { hrefFor } from "../routes";
import { useCareer } from "../use-career";
import { ImportPicker } from "./import-picker";
import { SlotConfirmDialog } from "./slot-confirm-dialog";
import { SlotList } from "./slot-list";
import { useSlotActions } from "./use-slot-actions";
import { useSlotList } from "./use-slot-list";

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
  const { career, importOffer } = useCareer();
  const { slots, failed, refresh } = useSlotList();
  const actions = useSlotActions(refresh);

  return (
    <section data-testid="saves-screen" className="flex max-w-[860px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-heading text-[40px] leading-none font-bold">{t("saves.title")}</h1>
        <p className="m-0 text-muted">{t("saves.hint")}</p>
      </div>
      {career ? null : <NoCareerNote />}
      <Card className="flex flex-wrap items-start gap-3">
        <ImportControls />
        {career ? (
          <Button data-testid="export-career" onClick={() => void actions.exportRunning()}>
            {t("saves.exportCareer")}
          </Button>
        ) : null}
      </Card>
      {importOffer ? (
        <ImportPicker
          slots={slots ?? []}
          busy={actions.busy}
          onChoose={(entry) => void actions.chooseImportTarget(entry)}
          onCancel={actions.cancelImport}
        />
      ) : null}
      {failed ? (
        <p className="m-0 text-bad" role="alert" data-testid="saves-list-error">
          {t("saves.listError")}
        </p>
      ) : null}
      {slots === null && !failed ? <SlotListSkeleton /> : null}
      <SlotList slots={slots ?? []} actions={actions} />
      {actions.pending ? (
        <SlotConfirmDialog
          pending={actions.pending}
          busy={actions.busy}
          onConfirm={() => void actions.confirm()}
          onClose={actions.closeConfirm}
        />
      ) : null}
    </section>
  );
}
