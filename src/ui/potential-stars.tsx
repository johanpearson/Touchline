import type { Translator } from "../i18n";

/** Filled and empty stars; the text label carries the value for assistive technology. */
export function PotentialStars({
  playerId,
  stars,
  t,
}: { playerId: string; stars: number } & Pick<Translator, "t">) {
  const label = t("squad.stars", { count: stars });
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-testid={`player-potential-${playerId}`}
      data-stars={stars}
      className="tracking-tight text-accent"
    >
      {"★".repeat(stars)}
      <span className="text-muted">{"☆".repeat(5 - stars)}</span>
    </span>
  );
}
