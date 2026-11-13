/** Variants of one commentary line per template key. Placeholders are written as `{name}`. */
export type TemplateSet<Key extends string = string> = Record<Key, readonly string[]>;
