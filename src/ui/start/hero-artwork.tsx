const LINE = {
  stroke: "var(--text)",
  strokeOpacity: 0.18,
  strokeWidth: 2.5,
  fill: "none",
} as const;

/**
 * A floodlit pitch behind the hero: a glow and the markings, with a dotted pass to a ball.
 * Decorative (hidden from assistive technology) and static, so reduced motion needs no special case.
 * Every colour is a theme token.
 */
export function HeroArtwork() {
  return (
    <svg
      viewBox="0 0 1050 680"
      aria-hidden="true"
      focusable="false"
      data-testid="hero-artwork"
      className="pointer-events-none absolute top-24 -right-40 h-auto w-[900px] max-w-none opacity-50 max-[640px]:top-40 max-[640px]:-right-72"
    >
      <defs>
        <radialGradient id="start-glow" cx="0.55" cy="0.45" r="0.6">
          <stop offset="0" stopColor="var(--glow)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--bg)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="1050" height="680" fill="url(#start-glow)" />
      <g {...LINE}>
        <rect x="10" y="10" width="1030" height="660" />
        <line x1="525" y1="10" x2="525" y2="670" />
        <circle cx="525" cy="340" r="91" />
        <rect x="10" y="138" width="165" height="404" />
        <rect x="875" y="138" width="165" height="404" />
        <rect x="10" y="248" width="55" height="184" />
        <rect x="985" y="248" width="55" height="184" />
      </g>
      <path
        d="M300 420 Q 420 300 560 330 T 840 230"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 14"
      />
      <circle cx="840" cy="230" r="11" fill="var(--accent)" />
    </svg>
  );
}
