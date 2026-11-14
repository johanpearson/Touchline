import type { SaveFileError } from "../platform";
import type { SaveEnvelope } from "../shared";

/** Why a picked file could not be imported. */
export type ImportError =
  | "not-json"
  | "not-a-save"
  | "newer-version"
  | "file-too-large"
  | "corrupt-career";

/** A validated file waiting for the user to choose a target slot. */
export type ImportOffer = {
  /** The migrated envelope with its original `createdAt` and `savedAt`; `game` is a parsed career. */
  envelope: SaveEnvelope;
  clubName: string;
  season: number;
  matchday: number;
};

export type ImportPickResult = "picked" | "cancelled" | "error";

export const importErrorFor = (error: SaveFileError): ImportError => {
  switch (error) {
    case "not-json":
      return "not-json";
    case "file-too-large":
      return "file-too-large";
    case "newer-version":
      return "newer-version";
    case "invalid-envelope":
    case "missing-migration":
      return "not-a-save";
  }
};
