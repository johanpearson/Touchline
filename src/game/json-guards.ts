/** Small hand-written guards for untrusted JSON. None of them throw on plain data. */

export type Rec = Record<string, unknown>;

export const isRecord = (value: unknown): value is Rec =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isString = (value: unknown): value is string => typeof value === "string";

export const isInt = (value: unknown): value is number => Number.isInteger(value);

export const isIntInRange = (value: unknown, min: number, max: number): value is number =>
  isInt(value) && (value as number) >= min && (value as number) <= max;

export const isNonNegativeInt = (value: unknown): value is number =>
  isInt(value) && (value as number) >= 0;

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

/** Maps every item with `parse`; returns `undefined` if the value is not an array or any item fails. */
export const parseList = <T>(
  value: unknown,
  parse: (item: unknown) => T | undefined,
): T[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const out: T[] = [];
  for (const item of value) {
    const parsed = parse(item);
    if (parsed === undefined) return undefined;
    out.push(parsed);
  }
  return out;
};

export const hasUniqueValues = (values: readonly string[]): boolean =>
  new Set(values).size === values.length;
