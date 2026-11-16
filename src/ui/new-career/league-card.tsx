import { Check } from "lucide-react";
import type { KeyboardEvent, Ref } from "react";
import { Badge, cn } from "../components";
import { useI18n } from "../i18n-provider";

export type LeagueCardProps = {
  id: string;
  name: string;
  region: string;
  /** Club count and format line, for example "14 clubs"; omitted for leagues that are not playable. */
  facts: readonly string[];
  checked: boolean;
  locked: boolean;
  tabStop: boolean;
  buttonRef: Ref<HTMLButtonElement>;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

/** One league in the radiogroup. A locked league is announced as disabled and cannot be chosen. */
export function LeagueCard({
  id,
  name,
  region,
  facts,
  checked,
  locked,
  tabStop,
  buttonRef,
  onSelect,
  onKeyDown,
}: LeagueCardProps) {
  const { t } = useI18n();
  const reasonId = `league-${id}-reason`;
  return (
    // biome-ignore lint/a11y/useSemanticElements: a card-shaped button as radio; arrow keys are handled by the group
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={checked}
      aria-disabled={locked || undefined}
      aria-describedby={locked ? reasonId : undefined}
      tabIndex={tabStop ? 0 : -1}
      data-testid={`league-card-${id}`}
      onClick={locked ? undefined : onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        "flex min-h-11 min-w-0 flex-col items-start gap-3.5 rounded-lg border bg-surface p-[18px] text-left font-[inherit] text-text",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        checked ? "border-2 border-accent" : "border-line",
        locked ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-raised",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
            checked ? "bg-accent text-on-accent" : "border border-line bg-sunk text-transparent",
          )}
        >
          <Check className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <strong className="font-heading text-2xl leading-[1.1] font-semibold [overflow-wrap:anywhere]">
            {name}
          </strong>
          <span className="text-[13px] text-muted">{region}</span>
        </span>
      </span>
      {facts.length > 0 ? (
        <span className="flex flex-wrap gap-x-4.5 gap-y-1 text-[13px] text-muted">
          {facts.map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </span>
      ) : null}
      {locked ? (
        <>
          <Badge>{t("newCareer.league.comingLater")}</Badge>
          <span id={reasonId} className="sr-only">
            {t("newCareer.league.locked")}
          </span>
        </>
      ) : null}
    </button>
  );
}
