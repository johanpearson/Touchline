# Design

Binding design decisions for the UI overhaul (milestone "M5c UI overhaul", epic #246). The boards in `reference/ui/` are the visual target; where a board and this document differ, this document wins. Boards are references only: never import or copy a `.dc.html` file into the app, rebuild each screen with the project's components and tokens.

## Boards

Read `reference/ui/README.md` for how to read the format.

| Board | Screen | Used by |
|---|---|---|
| [Welcome](../reference/ui/Welcome.dc.html) | Start screen: continue, new career, load career | #256 |
| [LeaguePicker](../reference/ui/LeaguePicker.dc.html) | New career, step 1: pick a league | #257 |
| [ClubPicker](../reference/ui/ClubPicker.dc.html) | New career, step 2: pick a club (crest, kits, strip) | #258 |
| [Main](../reference/ui/Main.dc.html) | Home with sidebar (Midnight) | #254, #259 |
| [MainLight](../reference/ui/MainLight.dc.html) | Home in the Light theme | #247, #259 |
| [Squad](../reference/ui/Squad.dc.html) | Squad table, density option | #252, #260 |
| [Match](../reference/ui/Match.dc.html) | Match screen, desktop | #267 |
| [PhoneHome](../reference/ui/PhoneHome.dc.html) | Home on a phone, bottom tab bar | #254, #259 |
| [PhoneMatch](../reference/ui/PhoneMatch.dc.html) | Match screen on a phone, tabs | #267 |

Screens without a board (player profile, tactics and lineup, league, club, pre-match, half-time, post-match, saves, settings) follow the same tokens, components and patterns; their issues say which board they borrow from.

## Direction: Floodlight

Dark-first, calm, rounded. Surfaces are quiet, numbers are big and clear, and the pitch glows. Radii run from 10 to 26 px: 10 px for small controls and chips, 14 px for buttons and tiles, 18 px for cards and tables, 26 px for hero cards; pills are 999 px.

- **Headings and numbers:** Barlow Condensed (500, 600, 700, 800). **Body:** Barlow (400, 500, 600). Fonts are bundled with `@fontsource` (self-hosted), not loaded from Google Fonts as the boards do, so the app works offline and inside Tauri and sends no third-party request.
- **Tabular numbers** (`font-variant-numeric: tabular-nums`) for every stat, score, clock, table cell and rating.
- Body text 15 px, small text 13 px (never below 12 px), headings 20 to 64 px.

## Themes

Three themes, selectable in settings and remembered (`ThemeStore`, `localStorage`, memory fallback). Midnight is the default. `data-theme="midnight" | "graphite" | "light"` on `<html>`; components use tokens only, never raw colours.

| Token | Midnight | Graphite | Light |
|---|---|---|---|
| `bg` | `#0A0E17` | `#0E0F11` | `#F3F5F9` |
| `side` (sidebar) | `#0D1220` | `#121316` | `#FFFFFF` |
| `surface` | `#121826` | `#17191C` | `#FFFFFF` |
| `raised` | `#1A2232` | `#1F2226` | `#EEF1F6` |
| `sunk` | `rgba(0,0,0,0.25)` | `rgba(0,0,0,0.25)` | `rgba(15,20,32,0.05)` |
| `track` (bars) | `#232C3F` | `#2A2E33` | `#E1E6EE` |
| `text` | `#E8EDF7` | `#EDEEF0` | `#0F1420` |
| `soft` | `#C3CBDB` | `#C7CAD0` | `#36405A` |
| `muted` | `#96A0B5` | `#9A9EA6` | `#5A6478` |
| `line` | `rgba(200,215,255,0.12)` | `rgba(255,255,255,0.10)` | `rgba(15,20,32,0.12)` |
| `glow` | `#1D3159` | `#30343B` | `#E4ECFB` |
| `stage` | `#121826` | `#17191C` | `#141B2B` |
| `stage-glow` | `#1D3159` | `#30343B` | `#22365E` |
| `good` | `#6EE7A8` | `#6EE7A8` | `#0B7A45` |
| `bad` | `#FF8FA0` | `#FF8FA0` | `#B8213A` |
| `info` | `#7FBFFF` | `#7FBFFF` | `#1A5FB8` |
| `warn` | `#F5C518` | `#F5C518` | `#7F5700` |
| `accent` | `#FFB547` | `#FFB547` | `#FFB547` |
| `on-accent` | `#0A0E17` | `#0A0E17` | `#0A0E17` |
| `focus` | `#FFB547` | `#FFB547` | `#0F1420` |

Values for bg, surface, raised, text and muted are as specified; the rest comes from the `SCHEMES` objects in the boards. Two deliberate differences from the boards, because the boards' Light values fail WCAG AA:

- **Light status colours.** The boards use `good #0E8A4F`, `bad #C2283D`, `info #1F6FD1`, `warn #9A6B00`. As text on Light `bg` and `raised` these measure 4.04, 5.25, 4.52 and 4.30 on `bg` and 3.89, 5.06, 4.36 and 4.14 on `raised`, so `good`, `info` and `warn` fail 4.5:1. The table uses darker values that pass (4.78 to 6.43 on `bg`, `surface` and `raised`).
- **Focus in Light.** Amber on white is 1.76:1, below the 3:1 a focus indicator needs. In Light the focus ring is `#0F1420` (16.9:1) with a 2 px offset; amber is still used on the dark stage and in the dark themes. Amber is never used as text on Light surfaces; amber buttons carry `on-accent` text (10.98:1).

Contrast of the table above (computed, WCAG relative luminance):

| Theme | text | muted | good | bad | info | warn | on-accent on accent |
|---|---|---|---|---|---|---|---|
| Midnight (bg / surface / raised) | 16.4 / 15.1 / 13.6 | 7.4 / 6.8 / 6.1 | 12.6 / 11.5 / 10.4 | 8.9 / 8.2 / 7.4 | 9.9 / 9.1 / 8.2 | 11.8 / 10.9 / 9.8 | 11.0 |
| Graphite | 16.5 / 15.2 / 13.8 | 7.1 / 6.6 / 5.9 | 12.5 / 11.5 / 10.4 | 8.9 / 8.1 / 7.4 | 9.9 / 9.1 / 8.2 | 11.8 / 10.8 / 9.8 | 11.0 |
| Light | 16.9 / 18.4 / 16.3 | 5.5 / 6.0 / 5.3 | 5.0 / 5.4 / 4.8 | 5.8 / 6.3 / 5.6 | 5.7 / 6.2 / 5.5 | 5.9 / 6.4 / 5.7 | 11.0 |

All values are at least 4.5:1. Issue #247 turns this into a test that parses the token file, so a later change cannot break it. Status colours never carry meaning alone: positions, results, fitness warnings and form always have text or shape cues as well.

## Colour roles

- **App accent: amber `#FFB547`** for primary actions, focus and highlights. One primary button per view.
- **Club colours are identity only:** crest, kit swatches, scoreboard bars, the user's row in tables (an edge accent), the active nav edge and match visuals. They are never used for buttons, links or text. Clubs with very light or very dark colours must still read (the accent edge sits on a neutral surface; text never sits on a club colour without a computed contrast pick).
- **Pitch and match visuals sit on a dark stage in every theme**, including Light (`stage` and `stage-glow` tokens). Text and lines drawn on the stage use fixed light-on-dark values that meet 4.5:1 against the stage.

## Kits

Every club has a home kit (primary body, secondary trim) and an away kit (secondary body, primary trim), derived from `Club.colours`; no stored data and no save change (#248). In a match, if the two home kit body colours are too similar (colour distance below `KIT_CLASH_THRESHOLD`, a named constant, tested), the away team wears its away kit; if that still clashes, the away team wears whichever of its kits is farthest from the home body colour. The home team always wears its home kit. The match view, scoreboard, stats, pre-match screen and ratings use the kit colours actually worn. Today `coloursOf` in `src/ui/match-setup.ts` only swaps when the primary colours are exactly equal.

## Navigation and shell

- **Desktop (1100 px and wider):** sidebar with icons and labels. **Tablet (640 to 1099 px):** icon rail that expands as an overlay, with tooltips. **Phone (below 640 px):** bottom tab bar with Home, Squad, Match, League and More; More opens a bottom sheet with the remaining screens.
- One navigation config (id, i18n key, icon, route, phone placement) feeds all three, so adding a screen means adding one entry.
- Items follow the screens that exist: Home, Squad, Tactics, Match, League, Club, Saves, Settings. The boards also show Fixtures (a tab inside League here), Transfers (M6) and Scout, Inbox and Morale (not planned); those appear only when the feature does.
- Header: club crest and name, league, season and round, save status, and the primary next-match action.
- **Command palette** on Ctrl/Cmd+K (and a search button for touch) for screens, clubs and players.
- Hash routing stays (works without server support). Route changes move focus to the page heading and update the document title.

## Start flow

Boards: Welcome, LeaguePicker, ClubPicker. Start screen with a Continue career card (club, round, position, save time), New career, and a Load career panel with the saved careers and Import save file. New career step 1 "Pick a league": league cards, only the current league selectable, future leagues shown as "Coming later". Step 2 "Pick your club": one large club card with crest, difficulty label, board expectation, attack, midfield and defence ratings, budget, star player, home and away kits; previous/next arrows; a horizontal club strip with hidden scrollbar, edge fade and scroll snap; the seed under "Advanced"; primary button "Manage <club>". Difficulty and expectation come from the club's rating rank in the league. The budget is an indicative figure derived from the rating rank until M6 adds real budgets (see conflicts below).

## Scrolling

Horizontal scrolling is allowed (club strip, tables, pitch stage on small screens), but scrollbars are hidden or styled to match the theme: no default browser scrollbars anywhere. A scroll container is focusable, labelled and scrollable with arrow keys.

## Tables

Compact density by default (8 px row padding), comfortable (14 px) as a setting. Columns have priorities 1 to 3; low-priority columns hide first on narrow screens, measured on the table's own width. On phones rows become cards. Sortable headers use `aria-sort`; sort is stable; names use the active locale's collation. The first column and the header are sticky when the table still overflows.

## Match screen

- **Wide screens:** the pitch with momentum and controls on the left; stats and commentary stacked in a side panel on the right; lineups one click away.
- **Small screens:** the panel becomes tabs (Stats, Feed, Lineups) under the pitch.
- **Controls:** Pause, Make changes, two or three touchline shouts, view switch (Terrain/2D), speed. Today only Pause, the view switch and speed exist, and changes are possible only at half-time. Make changes at any pause and the shouts need a game-rules decision first (#266); the layout reserves their place.
- The match visuals keep the three.js momentum terrain and the classic 2D pitch (the board draws a flat SVG for the terrain, a simplification).

## Quality

- **WCAG 2.2 AA**, full keyboard navigation, visible focus (not obscured), touch targets at least 44 px, no drag-only action.
- `prefers-reduced-motion` honoured everywhere (instant or opacity-only; no goal shake or shockwave).
- All text through i18n, English and Swedish; layouts are tested with the longer Swedish strings and the longest generated club names.
- Visual regression (#253) and axe (#272) run in CI; every screen issue adds its states to both.

## Stack

All free and open source. New dependencies each get a justification in the PR that adds them (`CLAUDE.md`).

| Choice | Why |
|---|---|
| React (kept) | Already the app framework; no reason to change. |
| Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`, dev) mapped to CSS custom property tokens | Utility styling with tokens as the single source; v4's `@theme` maps utilities to variables, so theme switching needs no JS. No runtime cost. |
| Radix UI primitives in shadcn/ui-style components owned in the repo | Accessible behaviour (focus trap, roving tabindex, ARIA) without writing it; components are copied into `src/ui/components`, so we own and adapt them. (`class-variance-authority`, `clsx`, `tailwind-merge` support the variants.) |
| lucide icons (`lucide-react`) | Consistent, tree-shakeable outline icons. |
| Motion (`motion`) for transitions | Small, declarative, honours reduced motion with one hook. |
| Storybook (`@storybook/react-vite`, dev) | A story per component and the base for visual regression. |
| `@fontsource/barlow`, `@fontsource/barlow-condensed` | Self-hosted fonts instead of the boards' Google Fonts link (offline, Tauri, privacy). Deviation from the boards. |
| Owned listbox for the palette (no `cmdk`) | Decided in #255: a small combobox on Radix Dialog gives exact control over `aria-activedescendant`, grouping and the search function without a new runtime dependency. |
| `@axe-core/playwright` (dev) | Automated WCAG checks in E2E. |

Bundle size is a watch item: the build already warns that the three.js chunk is over 500 kB; the shell and components stay out of that chunk, and the terrain is loaded on the match screen only (already lazy).

## Current UI and gaps (review on 2026-11-16)

Built with `npm run build` and screenshotted with Playwright at 1440x900, 1024x768 and 390x844 for 13 states (new career, hub, league, fixtures, club, squad, saves, match terrain, match 2D, half-time, full time, results, season end). The screenshots are not committed.

| Area | Today | Gap to the boards and decisions |
|---|---|---|
| Styling | `app.css` (270 lines) and `match-screen.css` (160 lines), unstyled browser defaults: serif font, blue links, default form controls, white background | No tokens, themes, fonts or components; everything needs restyling |
| Shell | Header with title, save status, language select; text-link nav (`career-nav.tsx`); `max-width: 1280px` | No sidebar, rail, tab bar, club identity header, palette |
| Start | New-career screen is a list of 14 text buttons with a seed field, "Saves" link and "Import file" button; Continue panel above it | No hero, continue card, load panel, league step, club card or strip |
| Home | A heading, club name, league name and the next-match block with two buttons | No comparison, mini table, squad status |
| Squad | One long page: selects for every starter and bench slot, tactics, ratings, then the table (about 1340 px tall at desktop, 2030 px on a phone) | Lineup and tactics need their own screen; table needs priorities, density, filter, cards |
| League, club, saves, results, season end | Plain tables and lists | New table component and cards |
| Match | Scoreboard, terrain, stats, momentum bar, commentary in one column on phones; speed buttons overlap the stats on a phone (see screenshot `p-08`) | New layout, stage, controls, tabs; half-time panel is 3,500 px tall on a phone |
| Phone | Horizontal page scroll on every screen at 390 px (all except new career) | Responsive layouts everywhere |
| Touch targets | Every button, link and input measured under 44 px (all 19 to 37 interactive elements per screen) | 44 px targets |
| Scrollbars | Default scrollbars | Hidden or themed |
| Focus | Browser default | Visible, designed focus; not obscured |
| i18n | 274 typed keys in `en` and `sv` (`src/i18n`), enforced equal; every visible string already goes through `t()` | Keep; add keys for new copy; check Swedish widths |
| Motion | None except the terrain | Reduced-motion rule, transitions |
| E2E | Five specs (`smoke`, `persistence`, `season-flow`, `match-engine`, `squad-and-tactics`) using about 50 `data-testid`s | Selectors must be kept or migrated in the same PR as each screen |

## Conflicts between the boards and the current code

These are not bugs in either; each is resolved in the issue named.

1. **Fictional data in the boards.** The boards show "Division 2", "round 12 of 30", ratings 39 to 79 and clubs like "Kvarnby FF". The game has one league of 14 clubs and 26 rounds, double round-robin, no promotion or relegation. League picker and home show the real numbers (#257, #259).
2. **Board features the game does not have:** injuries, suspensions, morale, contracts, player value, ability bars, shirt numbers, transfers and offers, scout reports, inbox, "Save and export" in the header. None are built; the squad table uses the game's fitness, form, overall, age and the 12 attributes (#259, #260). Transfers are M6 (#27).
3. **Budget on the club card.** The game has no budget before M6. #258 shows an indicative figure derived from the rating rank and marks it as a placeholder, or drops the tile; this needs a decision in review.
4. **Changes and shouts during the match.** The boards and decisions have Pause, Make changes and touchline shouts. Today changes are possible only at half-time (`docs/vision.md`, "Changes during a match (M5)"), the engine's `applyChange` works at any pause, but `planHalfTime` assumes the half-time moment for minutes. The new rules need a decision (#266). Until then Make changes works at half-time only and shouts are not shown.
5. **Terrain.** The board draws the momentum terrain as a flat SVG gradient; the game has a three.js height-map terrain and a 2D pitch with 22 players. We keep both and put them on the dark stage.
6. **Speed labels.** The board shows 1x, 3x, 8x; the game has four speeds (`SPEEDS`, shown as x1, x2, x4, x8). Keep the game's.
7. **Extra schemes in the boards.** Welcome and ClubPicker also define "Night pitch" and "Plum" schemes and four accents; only Midnight, Graphite and Light and the amber accent are in scope. The boards also tint the club picker glow with the club colour; kept, as identity only.
8. **Light theme status colours and focus** fail AA in the boards; corrected above.
9. **Navigation.** The boards list Tactics and Fixtures as separate screens. Fixtures stay a tab in League; Tactics becomes its own route (`#/tactics`), split out of `#/squad` (#262), because the squad screen is too long.
10. **Existing "away colour" rule** only swaps on exactly equal primaries; replaced by the tested clash rule (#248).
11. **Mobile.** `docs/vision.md` said "Mobile is a late milestone"; it is now in scope (decision entry in `docs/vision.md`).
12. **Fonts.** The boards load Google Fonts; we self-host.

## Issue plan

Epic #246, milestone "M5c UI overhaul". One session and one PR each, in dependency order.

| # | Issue | Depends on |
|---|---|---|
| #247 | Design tokens, themes, typography, theme switch | none |
| #248 | Kits and clash detection, used in the match view | none |
| #249 | Foundations 1: Storybook, button, icon button, badge, card, skeleton, empty state | #247 |
| #250 | Foundations 2: input, select, segmented control, tabs, scroll container | #249 |
| #251 | Foundations 3: dialog, drawer, tooltip, toast | #249 |
| #252 | Foundations 4: data table | #250 |
| #253 | Visual regression in CI | #247, #249 |
| #254 | App shell: sidebar, rail, bottom tabs, header | #247 to #249 to #251, #253 |
| #255 | Command palette | #254, #251 |
| #256 | Start screen | #247, #249 to #251, #253, #254 |
| #257 | New career step 1: league | #256 |
| #258 | New career step 2: club | #257, #248, #250 |
| #259 | Home | #254, #252, #253 |
| #260 | Squad | #254, #252, #250, #253 |
| #261 | Player profile | #260, #254, #249 |
| #262 | Tactics and lineup | #260, #254, #250, #251, #253 |
| #263 | League table and fixtures | #254, #252, #250, #253 |
| #264 | Club screen | #254, #252, #260, #261 |
| #265 | Pre-match | #254, #262, #248 |
| #266 | Changes at any pause and shouts (needs decision) | none |
| #267 | Match screen | #254, #248, #250, #251, #265, #253 |
| #268 | Half-time and changes panel | #267, #251, #262 |
| #269 | Post-match report, results, season end | #267, #252, #263 |
| #270 | Saves and settings | #254, #251, #252, #256, #247 |
| #271 | Motion and feedback pass | all screens, #251 |
| #272 | Accessibility audit with axe | all screens, #253, #271 |

Every screen issue names its board (if any) and has acceptance criteria for desktop, tablet and phone, all three themes, keyboard use, en and sv, and updated visual snapshots.

## Risks

- Large, long-running change: the old unstyled UI and the new components coexist until each screen is migrated; no big-bang merge. Every PR leaves the app working and E2E green.
- E2E selectors (`data-testid`) break easily during redesigns; each screen issue keeps or migrates them in the same PR.
- Visual snapshots need one rendering environment (CI Linux); #253 generates baselines in CI only. The WebGL terrain is not pixel-stable, so snapshots use an injected static renderer.
- Tailwind v4, Storybook and Radix add dependencies and build time; bundle size is monitored.
- The coverage and CodeScene Code Health gates apply to new UI code: components need real tests, not only stories.
- Swedish strings are longer; layouts must not depend on English widths.
