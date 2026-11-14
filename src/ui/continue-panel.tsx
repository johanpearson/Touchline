import type { ContinueError } from "./find-continue-candidate";
import { useI18n } from "./i18n-provider";
import { hrefFor } from "./routes";
import { useCareer } from "./use-career";

const ERROR_KEYS = {
  "invalid-envelope": "save.loadError.invalid",
  "invalid-career": "save.loadError.invalid",
  "newer-version": "save.loadError.newerVersion",
  store: "save.loadError.store",
} as const satisfies Record<ContinueError, string>;

/** Continue button for a found save, or the reason an unusable save was not loaded. */
export function ContinuePanel() {
  const { t } = useI18n();
  const { continueInfo, loadAutosave, loadError, dismissLoadError } = useCareer();

  const resume = async () => {
    if (await loadAutosave()) window.location.hash = hrefFor({ name: "home" });
  };

  if (loadError) {
    return (
      <section className="load-error" role="alert" data-testid="load-error">
        <p>{t(ERROR_KEYS[loadError])}</p>
        <button type="button" data-testid="start-new-career" onClick={dismissLoadError}>
          {t("save.startNew")}
        </button>
      </section>
    );
  }
  if (!continueInfo) return null;
  return (
    <button
      type="button"
      className="continue-career"
      data-testid="continue-career"
      onClick={resume}
    >
      <strong>{t("save.continue")}</strong>{" "}
      <span>
        {t("save.continueDetails", {
          club: continueInfo.clubName,
          season: continueInfo.season,
          matchday: continueInfo.matchday,
        })}
      </span>
    </button>
  );
}
