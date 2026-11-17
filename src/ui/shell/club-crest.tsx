import { readableOn } from "./readable-on";

export type ClubCrestProps = {
  shortName: string;
  colours: { primary: string; secondary: string };
  /** Pixel size of the square crest. */
  size?: number;
  /** Names the crest for assistive technology; without it the crest is decorative. */
  label?: string;
  className?: string;
};

const SHIELD = "M4 3h32v17c0 9-6 15-16 18C10 35 4 29 4 20z";

/** The club badge: a shield in the club colours with the short name as initials. */
export function ClubCrest({ shortName, colours, size = 40, label, className }: ClubCrestProps) {
  const initials = shortName.slice(0, 3).toUpperCase();
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={SHIELD} fill={colours.primary} />
      <path d="M4 3h32v7H4z" fill={colours.secondary} />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fontSize={initials.length > 2 ? 11 : 13}
        fontWeight="700"
        fontFamily="Barlow Condensed, sans-serif"
        fill={readableOn(colours.primary)}
      >
        {initials}
      </text>
    </svg>
  );
}
