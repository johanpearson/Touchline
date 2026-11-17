import { ChevronLeft } from "lucide-react";
import { useI18n } from "../i18n-provider";

type WizardHeaderProps = {
  step: number;
  total: number;
  title: string;
  backHref: string;
  backLabel: string;
};

/** The top of a wizard step: a back link, the step counter and the step title. */
export function WizardHeader({ step, total, title, backHref, backLabel }: WizardHeaderProps) {
  const { t } = useI18n();
  return (
    <header className="flex items-center gap-3.5 pb-2">
      <a
        data-testid="wizard-back"
        href={backHref}
        aria-label={backLabel}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-text no-underline hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <ChevronLeft aria-hidden="true" className="size-[18px]" />
      </a>
      <div className="flex min-w-0 flex-col">
        <span data-testid="wizard-step" className="text-[13px] text-muted">
          {t("newCareer.step", { step, total })}
        </span>
        <h2 className="m-0 font-heading text-[30px] leading-[1.05] font-semibold">{title}</h2>
      </div>
    </header>
  );
}
