import { useState } from "react";
import { Button, Card, Skeleton } from "../components";
import type { ContinueError } from "../find-continue-candidate";
import { useI18n } from "../i18n-provider";
import { navigateUnguarded } from "../navigation-guard";
import { hrefFor } from "../routes";
import { KitIcon } from "../shell/kit-icon";
import { type ContinueInfo, useCareer } from "../use-career";
import { describeContinue } from "./describe-save";

const ERROR_KEYS = {
  "invalid-envelope": "save.loadError.invalid",
  "invalid-career": "save.loadError.invalid",
  "newer-version": "save.loadError.newerVersion",
  store: "save.loadError.store",
} as const satisfies Record<ContinueError, string>;

/** Placeholder while the first look for a save is running. */
export function ContinueCardSkeleton() {
  return (
    <Skeleton
      data-testid="continue-skeleton"
      className="h-[92px] w-full rounded-lg border border-line"
    />
  );
}

/** The newest career, as one big button: kit, club, where the career stands and when it was saved. */
export function ContinueCard({ info, nowIso }: { info: ContinueInfo; nowIso: string }) {
  const { t, locale } = useI18n();
  const { loadAutosave } = useCareer();

  const resume = async () => {
    if (await loadAutosave()) navigateUnguarded(hrefFor({ name: "home" }));
  };

  return (
    <button
      type="button"
      data-testid="continue-career"
      onClick={() => void resume()}
      className="flex w-full cursor-pointer items-center gap-4 rounded-lg border border-line bg-surface p-4 text-left text-text transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus "
    >
      <KitIcon kit={info.kit} size={44} className="shrink-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-muted">{t("start.continue.label")}</span>
        <strong className="truncate font-heading text-2xl leading-tight font-semibold">
          {info.clubName}
        </strong>
        <span className="text-[13px] text-muted">{describeContinue(t, locale, info, nowIso)}</span>
      </span>
      <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-accent px-5 font-bold text-on-accent max-[400px]:px-3">
        {t("start.continue.action")}
      </span>
    </button>
  );
}

/** The reason the newest save was not loaded, with the way out: delete it or start fresh. */
export function LoadErrorCard({ error }: { error: ContinueError }) {
  const { t } = useI18n();
  const { discardLoadError, dismissLoadError } = useCareer();
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  const discard = async () => {
    setDeleting(true);
    setFailed(false);
    const result = await discardLoadError();
    if (!result.ok) {
      setFailed(true);
      setDeleting(false);
    }
  };

  return (
    <Card role="alert" data-testid="load-error" className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-xl font-semibold">{t("start.error.title")}</h2>
      <p className="m-0 text-muted">{t(ERROR_KEYS[error])}</p>
      {failed ? (
        <p className="m-0 text-bad" data-testid="delete-error">
          {t("start.error.deleteFailed")}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          data-testid="delete-save"
          loading={deleting}
          loadingLabel={t("start.error.deleting")}
          onClick={() => void discard()}
        >
          {t("start.error.delete")}
        </Button>
        <Button
          data-testid="start-new-career"
          onClick={() => {
            dismissLoadError();
            window.location.hash = hrefFor({ name: "new" });
          }}
        >
          {t("save.startNew")}
        </Button>
      </div>
    </Card>
  );
}
