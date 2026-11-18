import {
  askingPrice,
  type Career,
  marketValue,
  type Player,
  playerOverall,
  signingWage,
  type TransferOffer,
} from "../../game";
import { potentialStars } from "../squad-rows";

/** One player on the market: for sale at a club, or a free agent (no club, no fee). */
export type MarketRow = {
  player: Player;
  /** The selling club, or null for a free agent. */
  clubId: string | null;
  clubName: string | null;
  overall: number;
  /** 1 to 5. */
  potentialStars: number;
  value: number;
  /** The fee the club asks, in thousands; 0 for a free agent. */
  fee: number;
  /** The wage the player asks per season, in thousands. */
  wage: number;
};

/** The fee a club asks; a free agent (no club) costs none. */
const feeOf = (career: Career, playerId: string, clubId: string | null): number | undefined =>
  clubId === null ? 0 : askingPrice(career, playerId);

const marketRow = (
  career: Career,
  player: Player,
  clubId: string | null,
  clubName: string | null,
): MarketRow | undefined => {
  const value = marketValue(career, player.id);
  const wage = signingWage(career, player.id);
  const fee = feeOf(career, player.id, clubId);
  const known = [value, wage, fee].every((amount) => amount !== undefined);
  if (!known) return undefined;
  return {
    player,
    clubId,
    clubName,
    overall: playerOverall(player),
    potentialStars: potentialStars(player.potential),
    value: value as number,
    fee: fee as number,
    wage: wage as number,
  };
};

const playersById = (career: Career): Map<string, Player> =>
  new Map(career.league.players.map((p) => [p.id, p]));

const present = (row: MarketRow | undefined): row is MarketRow => row !== undefined;

/** The players of all AI clubs, in club and squad order. */
export const playerRows = (career: Career): MarketRow[] => {
  const byId = playersById(career);
  return career.league.clubs
    .filter((club) => club.id !== career.userClubId)
    .flatMap((club) =>
      club.playerIds.map((id) => {
        const player = byId.get(id);
        return player ? marketRow(career, player, club.id, club.name) : undefined;
      }),
    )
    .filter(present);
};

/** The free-agent pool, in pool order. */
export const freeAgentRows = (career: Career): MarketRow[] => {
  const byId = playersById(career);
  return career.freeAgentIds
    .map((id) => {
      const player = byId.get(id);
      return player ? marketRow(career, player, null, null) : undefined;
    })
    .filter(present);
};

export type OfferRow = {
  offer: TransferOffer;
  player: Player;
  clubName: string;
  overall: number;
  value: number;
};

/** The incoming offers for the user's players. */
export const offerRows = (career: Career): OfferRow[] => {
  const byId = playersById(career);
  return career.offers.flatMap((offer) => {
    const player = byId.get(offer.playerId);
    const club = career.league.clubs.find((c) => c.id === offer.fromClubId);
    if (!player || !club) return [];
    const value = marketValue(career, player.id) ?? 0;
    return [{ offer, player, clubName: club.name, overall: playerOverall(player), value }];
  });
};

export type OwnPlayerRow = {
  player: Player;
  overall: number;
  value: number;
  /** The wage he is paid now, in thousands. */
  wage: number;
  contractEnd: number;
};

/** The user's players, for the release list. */
export const ownPlayerRows = (career: Career): OwnPlayerRow[] => {
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  const ids = new Set(club?.playerIds);
  return career.league.players
    .filter((p) => ids.has(p.id))
    .map((player) => {
      const contract = career.contracts[player.id];
      return {
        player,
        overall: playerOverall(player),
        value: marketValue(career, player.id) ?? 0,
        wage: contract?.wage ?? 0,
        contractEnd: contract?.expiresSeason ?? career.season.number,
      };
    });
};
