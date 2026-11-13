import type { SaveEnvelope } from "../../shared";
import { readEnvelope } from "./codec";
import type { MigrationError } from "./migrations";

/** Largest save file accepted on import: 10 MB (10 * 1024 * 1024 bytes of UTF-8 text). */
export const MAX_SAVE_FILE_BYTES = 10 * 1024 * 1024;

export type SaveFileError = MigrationError | "not-json" | "file-too-large";

export type ParseSaveFileResult =
  | { ok: true; save: SaveEnvelope }
  | { ok: false; error: SaveFileError };

const MAX_SLUG_LENGTH = 40;

/** Pretty-printed (2 spaces) JSON, the exported file content. */
export const serializeSave = (envelope: SaveEnvelope): string => JSON.stringify(envelope, null, 2);

/** Validates and migrates the text of an imported file. Never throws. */
export function parseSaveFile(text: string): ParseSaveFileResult {
  if (new TextEncoder().encode(text).length > MAX_SAVE_FILE_BYTES) {
    return { ok: false, error: "file-too-large" };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "not-json" };
  }
  return readEnvelope(raw);
}

function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return slug === "" ? "club" : slug;
}

const safeNumber = (n: number): number => (Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0);

/** `touchline-<club-slug>-s<season>-md<matchday>.json`, always a plain file name. */
export function saveFileName(meta: { clubName: string; season: number; matchday: number }): string {
  return `touchline-${slugify(meta.clubName)}-s${safeNumber(meta.season)}-md${safeNumber(meta.matchday)}.json`;
}
