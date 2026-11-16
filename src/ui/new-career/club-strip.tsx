import { type KeyboardEvent, useEffect, useRef } from "react";
import { cn, ScrollArea } from "../components";
import { useI18n } from "../i18n-provider";
import { ClubCrest } from "../shell/club-crest";
import type { ClubCard } from "./club-cards";

type ClubStripProps = {
  cards: readonly ClubCard[];
  selected: number;
  onSelect: (index: number) => void;
};

/** The index a key moves the selection to (wrapping at the ends), or null for any other key. */
export const stripTarget = (key: string, from: number, count: number): number | null => {
  if (key === "ArrowRight") return (from + 1) % count;
  if (key === "ArrowLeft") return (from - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
};

/**
 * A horizontal listbox of all clubs with edge fade and snap. The selected club scrolls into view and
 * keeps focus if the strip had it, so keyboard use does not lose its place.
 */
export function ClubStrip({ cards, selected, onSelect }: ClubStripProps) {
  const { t } = useI18n();
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const mounted = useRef(false);

  useEffect(() => {
    const option = options.current[selected];
    if (mounted.current && option) {
      const hadFocus = options.current.some((o) => o === document.activeElement);
      option.scrollIntoView?.({ block: "nearest", inline: "center" });
      if (hadFocus) option.focus({ preventScroll: true });
    }
    mounted.current = true;
  }, [selected]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = stripTarget(event.key, index, cards.length);
    if (target === null) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect(target);
  };

  return (
    <ScrollArea label={t("newCareer.club.strip")} fade snap data-testid="club-strip">
      <div
        role="listbox"
        aria-label={t("newCareer.club.list")}
        aria-orientation="horizontal"
        className="flex w-max gap-2.5 py-1"
      >
        {cards.map((card, index) => {
          const isSelected = index === selected;
          return (
            <button
              key={card.club.id}
              ref={(node) => {
                options.current[index] = node;
              }}
              type="button"
              role="option"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              data-testid={`club-option-${card.club.id}`}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "flex min-h-11 w-40 shrink-0 cursor-pointer flex-col items-start gap-1.5 rounded-lg border bg-surface p-3 text-left font-[inherit] text-text",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                isSelected ? "border-2 border-accent" : "border-line hover:bg-raised",
              )}
            >
              <ClubCrest shortName={card.club.shortName} colours={card.club.colours} size={32} />
              <span
                data-testid="club-option-name"
                className="text-sm leading-tight font-semibold [overflow-wrap:anywhere]"
              >
                {card.club.name}
              </span>
              <span className="text-xs text-muted tabular">
                {t("newCareer.rating")} {card.rating}
              </span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
