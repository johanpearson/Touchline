import { generateLeague, type Kit } from "../../game";
import type { MessageKey } from "../../i18n";
import { clubRating } from "../club-rating";

/**
 * The wizard's id for "the generated league". The league's own id is made from its generated name,
 * so it changes with the seed; the choice must survive a seed change.
 */
export const PLAYABLE_LEAGUE_ID = "generated-league";

/** How many of the strongest clubs the preview names. */
export const TOP_CLUBS_SHOWN = 5;

export type PreviewClub = { id: string; name: string; kit: Kit; rating: number };

export type LeaguePreview = {
  id: string;
  name: string;
  clubCount: number;
  /** Matchdays of a double round-robin: every club meets every other home and away. */
  rounds: number;
  topClubs: PreviewClub[];
  /** Clubs not named in `topClubs`. */
  moreCount: number;
  minRating: number;
  maxRating: number;
};

/** A league on the roadmap: display strings only, not game data. */
export type RoadmapLeague = {
  id: string;
  nameKey: MessageKey;
  regionKey: MessageKey;
};

export const ROADMAP_LEAGUES: readonly RoadmapLeague[] = [
  {
    id: "second-division",
    nameKey: "newCareer.league.second.name",
    regionKey: "newCareer.league.second.region",
  },
  {
    id: "coastal-league",
    nameKey: "newCareer.league.coastal.name",
    regionKey: "newCareer.league.coastal.region",
  },
  {
    id: "northern-cup",
    nameKey: "newCareer.league.cup.name",
    regionKey: "newCareer.league.cup.region",
  },
];

/** What the league step shows about the playable league for a seed, or null if it cannot be made. */
export const previewLeague = (seed: number): LeaguePreview | null => {
  const generated = generateLeague({ seed });
  if (!generated.ok) return null;
  const { id, name, clubs, players } = generated.league;
  const rated = clubs
    .map((club) => ({
      id: club.id,
      name: club.name,
      kit: { body: club.colours.primary, trim: club.colours.secondary },
      rating: clubRating(club, players),
    }))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  const ratings = rated.map((club) => club.rating);
  return {
    id,
    name,
    clubCount: clubs.length,
    rounds: (clubs.length - 1) * 2,
    topClubs: rated.slice(0, TOP_CLUBS_SHOWN),
    moreCount: Math.max(0, rated.length - TOP_CLUBS_SHOWN),
    minRating: Math.min(...ratings),
    maxRating: Math.max(...ratings),
  };
};
