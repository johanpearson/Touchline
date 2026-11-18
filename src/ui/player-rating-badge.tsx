import { TriangleAlert, Zap } from "lucide-react";
import { cn } from "./components";
import { useI18n } from "./i18n-provider";
import { LOW_FITNESS } from "./plan-rows";

export type PlayerRatingBadgeProps = {
  /** The effective rating at the slot's position, 1..20. */
  rating: number;
  /** The player's energy (fitness), 0 to 100. */
  fitness: number;
  /**
   * `compact` stacks the rating over the energy and keeps the low fitness text for screen readers
   * (pitch); `inline` puts them side by side and shows the text (lists, pickers).
   */
  layout?: "compact" | "inline";
  /** `stage` uses the fixed light-on-dark colours of the pitch stage; `surface` uses the theme tokens. */
  tone?: "surface" | "stage";
  className?: string;
};

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

const TONES = {
  surface: {
    rating: "text-text",
    energy: "text-muted",
    track: "bg-track",
    fill: "bg-soft",
    warnText: "text-warn",
    warnFill: "bg-warn",
  },
  stage: {
    rating: "text-[#e8edf7]",
    energy: "text-[#c3cce0]",
    track: "bg-white/20",
    fill: "bg-[#c3cce0]",
    warnText: "text-[#ffd27a]",
    warnFill: "bg-[#ffd27a]",
  },
} as const;

/**
 * One place for how a player's rating and energy look: the rating (what the engine uses at that
 * position) is the primary figure, energy is a quieter bar and number. Low energy adds a warning
 * shape and text, never colour alone.
 */
export function PlayerRatingBadge(props: PlayerRatingBadgeProps) {
  const { t, formatNumber } = useI18n();
  const { rating, fitness, layout = "compact", tone = "surface" } = props;
  const colours = TONES[tone];
  const low = fitness < LOW_FITNESS;
  return (
    <span
      data-testid="rating-badge"
      className={cn(
        "inline-flex tabular",
        layout === "compact" ? "flex-col items-center gap-px" : "items-center gap-3",
        props.className,
      )}
    >
      <span
        data-testid="rating-value"
        className={cn("font-heading text-base font-semibold leading-none", colours.rating)}
      >
        <span className="sr-only">{t("player.rating")} </span>
        {formatNumber(rating, 1)}
      </span>
      <span className={cn("inline-flex items-center gap-1 text-xs", colours.energy)}>
        {low ? (
          <TriangleAlert aria-hidden="true" className={cn("size-3", colours.warnText)} />
        ) : (
          <Zap aria-hidden="true" className="size-3" />
        )}
        <span
          data-testid="fitness-bar"
          aria-hidden="true"
          className={cn("h-1 w-6 overflow-hidden rounded-pill", colours.track)}
        >
          <span
            className={cn("block h-full rounded-pill", low ? colours.warnFill : colours.fill)}
            style={{ width: `${clampPercent(fitness)}%` }}
          />
        </span>
        <span className="sr-only">{t("player.fitness")} </span>
        <span data-testid="fitness-value" className="text-xs">
          {fitness}
        </span>
        {low ? (
          <span className={layout === "compact" ? "sr-only" : undefined}>
            {t("squad.lowFitness")}
          </span>
        ) : null}
      </span>
    </span>
  );
}
