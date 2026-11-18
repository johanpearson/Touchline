/**
 * Which registered screen states (e2e/visual/screen-states.ts) cover each route of src/ui/routes.ts in the
 * accessibility audit (#272). `scripts/a11y-route-coverage.test.ts` fails when a route has no entry here or an
 * entry names a state that is not registered, so a new route cannot ship without being audited.
 */
export const ROUTE_STATES: Readonly<Record<string, readonly string[]>> = {
  home: ["start-empty", "hub-first-matchday", "hub-mid-season"],
  new: ["new-career-league"],
  "new-club": ["new-career-club-easy", "new-career-club-long-name"],
  squad: ["squad-default"],
  player: ["player-outfield", "player-goalkeeper"],
  tactics: ["tactics-442", "tactics-picker"],
  market: ["market-players"],
  league: ["league-mid-season", "league-fixtures-start"],
  club: ["club-other", "club-mine"],
  match: ["pre-match", "match-kickoff", "match-half-time-changes", "match-full-time"],
  results: ["matchday-results"],
  "season-end": ["season-end"],
  "off-season": ["off-season"],
  saves: ["saves-slots-and-corrupt"],
  settings: ["settings-default"],
  "not-found": ["not-found"],
};
