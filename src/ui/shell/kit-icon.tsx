import type { Kit } from "../../game";

export type KitIconProps = {
  kit: Kit;
  /** Pixel width; the height follows. */
  size?: number;
  /** Names the icon for assistive technology; without it the icon is decorative. */
  label?: string;
  className?: string;
};

const SHIRT = "M13 4 5 8 1 18l7 3 1-5v20h22V16l1 5 7-3-4-10-8-4c-1 3-4 4-7 4s-6-1-7-4z";

/** A shirt in the kit colours: body colour for the shirt, trim colour for sleeves and collar. */
export function KitIcon({ kit, size = 32, label, className }: KitIconProps) {
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
      <path d={SHIRT} fill={kit.body} />
      <path d="M13 4c1 3 4 4 7 4s6-1 7-4l-3-1c-1 2-2 3-4 3s-3-1-4-3z" fill={kit.trim} />
      <path d="M1 18 5 8l4 2-3 9zM39 18 35 8l-4 2 3 9z" fill={kit.trim} />
    </svg>
  );
}
