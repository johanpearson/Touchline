# Accessibility (WCAG 2.2 AA)

Binding target: WCAG 2.2 level AA (`docs/design.md`, Quality). Two layers keep it: automated checks that run in CI, and a manual checklist run by a person before a release and after a big UI change.

## Automated

| Check | Where | What it proves |
|---|---|---|
| axe audit | `e2e/a11y.spec.ts`, config `playwright.a11y.config.ts`, `npm run test:a11y`, CI job `Accessibility` | Zero violations of the tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa` on every screen state of the visual registry (`e2e/visual/screen-states.ts`) at 1440x900, 1024x768 and 390x844, in Midnight, Graphite and Light, in English and Swedish. |
| Route coverage | `scripts/a11y-route-coverage.test.ts`, map in `e2e/a11y-routes.ts` | Fails when a route is added to `src/ui/routes.ts` without at least one registered state that audits it. |
| Keyboard flows | `e2e/a11y-keyboard.spec.ts` | Start a new career, play and pause a match, make a half-time substitution, save and load, all with Tab and Enter or Space only. |
| Reflow | `e2e/a11y-reflow.spec.ts` | No horizontal page scroll at 320 px wide and at 400% zoom (320x256). |

A new screen or state is registered once in `e2e/visual/screen-states.ts` and is then covered by the screenshots and by axe. To audit a new route, also add it to `e2e/a11y-routes.ts`.

Rules:

- Zero violations is the gate. A rule is never disabled and a node never excluded without a comment that links an issue.
- axe `incomplete` results (needs a human look) are attached to the test as an `axe-incomplete` annotation in the report. Review them when you change a screen.
- Themes are switched on the open page (`data-theme`), because a theme only changes tokens. Languages and widths are separate runs.

## Manual checklist

Run it in a normal browser window against `npm run preview`. Note the result, the browser and the date in the PR that does the run. An accepted exception needs a linked issue.

| # | Criterion | How to check |
|---|---|---|
| 1 | Keyboard only (2.1.1, 2.1.2, 2.4.3) | Without the mouse: start a career, play and pause a match, make a half-time change, save and load. Nothing traps focus; dialogs and sheets return focus to the control that opened them. |
| 2 | Focus visible and not obscured (2.4.7, 2.4.11) | Tab through every screen at 390 px: the focused control is outlined and never hidden under the bottom tab bar, the header or a toast. |
| 3 | Target size (2.5.8) | Touch controls are at least 44 px; inspect the tab bar, icon buttons, table row links and the pitch slots on a phone width. |
| 4 | No drag-only action (2.5.7) | Everything on the tactics screen that can be dragged also works with the picker or the keyboard. |
| 5 | Consistent navigation and help (3.2.3, 3.2.6) | Navigation items keep their order on every screen and width; the language and theme controls are in the same place. |
| 6 | Status messages (4.1.3) | Toasts, the goal announcement and the save result are announced by a screen reader without taking focus; the match log does not announce every tick. |
| 7 | Reflow (1.4.10) | 320 px wide and 400% zoom: no horizontal page scroll. Only tables and the pitch stage scroll in their own container. |
| 8 | Text spacing (1.4.12) | Apply the text spacing bookmarklet (line height 1.5, paragraph 2x, letter 0.12em, word 0.16em): nothing is clipped or overlaps. |
| 9 | Reduced motion | With `prefers-reduced-motion: reduce` there is no transform transition, no goal shake and no shockwave. |
| 10 | Forced colours smoke check | Windows High Contrast or `forced-colors: active` in the dev tools: text, borders, focus rings and the selected states stay visible. |
| 11 | Screen reader smoke check | NVDA, VoiceOver or Narrator: controls have names, each screen has one `h1`, landmarks exist (banner, navigation, main), the match screen has a text alternative for the terrain and live regions for score events. |

## Results log

| Date | Version | Checked by | Result | Exceptions |
|---|---|---|---|---|
| 2026-11-17 | #272 | automated only | axe zero violations (see the PR for the manual run) | none |
