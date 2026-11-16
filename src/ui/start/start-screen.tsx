import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../components";
import { useI18n } from "../i18n-provider";
import { hrefFor } from "../routes";
import { StorageWarning } from "../storage-warning";
import { useCareer } from "../use-career";
import { ContinueSlot } from "./continue-slot";
import { HeroArtwork } from "./hero-artwork";
import { SavedCareersPanel } from "./saved-careers-panel";
import { StartHeader } from "./start-header";

const PANEL_ID = "saved-careers-panel";

type StartScreenProps = {
  /** Clock returning an ISO 8601 timestamp; the screen never reads the time itself. */
  now: () => string;
  storageAvailable: boolean;
};

/**
 * The first screen without a running career: Continue card, New career and the saved careers.
 * The main content comes first in the document, so the Continue card is the first thing the
 * keyboard reaches; the header (language, theme, settings) is placed above it by the layout.
 */
export function StartScreen({ now, storageAvailable }: StartScreenProps) {
  const { t } = useI18n();
  const { continueInfo, startupChecked } = useCareer();
  const [nowIso] = useState(now);
  // Open by default when there is nothing to continue; decided once, after the first look for a save.
  const [loadOpen, setLoadOpen] = useState<boolean | null>(null);
  const open = loadOpen ?? (startupChecked && !continueInfo);

  return (
    <div
      data-testid="start-screen"
      className="relative flex min-h-dvh flex-col-reverse overflow-hidden bg-bg text-text"
    >
      <HeroArtwork />
      <main className="relative mx-auto box-border flex w-full max-w-[1200px] flex-1 flex-wrap items-center gap-10 px-4 pt-6 pb-12 sm:px-10">
        {storageAvailable ? null : <StorageWarning />}
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-6 sm:max-w-[520px]">
          <h1 className="m-0 font-heading text-[44px] leading-[0.98] font-bold sm:text-[64px]">
            <span className="block">{t("start.hero.line1")}</span>
            <span className="block">{t("start.hero.line2")}</span>
            <span className="block">{t("start.hero.line3")}</span>
          </h1>
          <p className="m-0 max-w-[40ch] text-[17px] leading-normal text-muted">
            {t("start.hero.text")}
          </p>
          <ContinueSlot nowIso={nowIso} />
          <div className="flex flex-wrap gap-2.5">
            <Button asChild variant="primary" size="lg">
              <a
                data-testid="new-career-link"
                href={hrefFor({ name: "new" })}
                className="no-underline"
              >
                <Plus aria-hidden="true" className="size-[18px]" />
                {t("start.new")}
              </a>
            </Button>
            <Button
              size="lg"
              data-testid="load-toggle"
              aria-expanded={open}
              aria-controls={open ? PANEL_ID : undefined}
              onClick={() => setLoadOpen(!open)}
            >
              {t("start.load")}
            </Button>
          </div>
        </div>
        {open ? (
          <div className="flex flex-[1_1_380px] justify-end max-[640px]:justify-start">
            <SavedCareersPanel id={PANEL_ID} nowIso={nowIso} />
          </div>
        ) : null}
      </main>
      <StartHeader />
    </div>
  );
}
