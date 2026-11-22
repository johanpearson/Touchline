import type { Rng, Side } from "../engine";
import type { Locale } from "../i18n";
import type { CommentaryKind } from "./commentary-line";
import type { ActionTemplateKey } from "./templates/action-templates";

export type Params = Record<string, string | number>;

/** One line to emit: which template, what it is about and the names to fill in. */
export type ActionPiece = {
  key: ActionTemplateKey;
  kind: CommentaryKind;
  team: Side | undefined;
  big?: boolean;
  /** Placeholders beyond the team names and the score. */
  params: Params;
};

export type DescribeContext = {
  locale: Locale;
  /** Display name of a player id (the id itself when unknown). */
  nameOf: (id: string | undefined) => string;
  rng: Rng;
};
