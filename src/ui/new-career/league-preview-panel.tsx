import { ArrowRight } from "lucide-react";
import { Button } from "../components";
import { useI18n } from "../i18n-provider";
import { KitIcon } from "../shell/kit-icon";
import type { LeaguePreview } from "./league-preview";

type LeaguePreviewPanelProps = { preview: LeaguePreview; onChoose: () => void };

/** The selected league: format, strongest clubs and the way on to step 2. */
export function LeaguePreviewPanel({ preview, onChoose }: LeaguePreviewPanelProps) {
  const { t } = useI18n();
  return (
    <aside
      aria-label={t("newCareer.league.preview")}
      data-testid="league-preview"
      className="box-border flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 rounded-xl border border-line bg-surface p-5 lg:max-w-[380px]"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted">{t("newCareer.league.selected")}</span>
        <strong
          data-testid="preview-name"
          className="font-heading text-[28px] leading-[1.1] font-semibold"
        >
          {preview.name}
        </strong>
        <span data-testid="preview-format" className="text-[13px] text-muted">
          {t("newCareer.league.roundCount", { rounds: preview.rounds })}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="mb-1 text-xs text-muted">{t("newCareer.league.strongest")}</span>
        <ol className="m-0 flex list-none flex-col gap-0.5 p-0" data-testid="preview-top">
          {preview.topClubs.map((club) => (
            <li key={club.id} className="flex min-h-9 items-center gap-2.5 text-sm">
              <KitIcon kit={club.kit} size={22} />
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{club.name}</span>
              <strong className="tabular">{club.rating}</strong>
            </li>
          ))}
        </ol>
        <span data-testid="preview-more" className="mt-1 text-[13px] text-muted">
          {t("newCareer.league.more", {
            count: preview.moreCount,
            min: preview.minRating,
            max: preview.maxRating,
          })}
        </span>
      </div>
      <Button
        variant="primary"
        size="lg"
        data-testid="choose-club"
        className="min-h-[52px] rounded-[14px] text-base font-bold"
        onClick={onChoose}
      >
        {t("newCareer.league.choose")}
        <ArrowRight aria-hidden="true" className="size-[18px]" />
      </Button>
    </aside>
  );
}
