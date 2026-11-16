import { type Career, type Kit, kitsOf } from "../game";
import type { SaveEnvelope } from "../shared";
import { FALLBACK_KIT } from "./start/fallback-kit";
import { userPosition } from "./start/user-position";

/** What the Continue card shows about the save it would load. */
export type ContinueInfo = {
  clubName: string;
  /** The club's home kit, for the swatch. */
  kit: Kit;
  season: number;
  matchday: number;
  /** The club's place in the league table, or null when it cannot be worked out. */
  position: number | null;
  /** When the save was written (ISO 8601, from the injected clock). */
  savedAt: string;
};

/** Describes a loaded save for the Continue card. */
export function continueInfoOf(saved: Career, envelope: SaveEnvelope): ContinueInfo {
  const club = saved.league.clubs.find((c) => c.id === saved.userClubId);
  return {
    clubName: club?.name ?? saved.userClubId,
    kit: club ? kitsOf(club).home : FALLBACK_KIT,
    season: saved.season.number,
    matchday: saved.season.currentMatchday,
    position: userPosition(saved),
    savedAt: envelope.savedAt,
  };
}
