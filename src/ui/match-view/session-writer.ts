/** The longest a running match goes without its position being written. */
export const SESSION_WRITE_INTERVAL_MS = 3000;

export type SessionWriter<T> = {
  /** Writes `value` at once; for changes, pauses and period changes. */
  now: (value: T) => void;
  /** Writes `value` if the interval has passed since the last write; for the running clock. */
  throttled: (value: T) => void;
};

/** Writes the match position through `write`, at most once per `intervalMs` while the clock runs. */
export const createSessionWriter = <T>(
  write: (value: T) => void,
  clock: () => number,
  intervalMs: number = SESSION_WRITE_INTERVAL_MS,
): SessionWriter<T> => {
  let lastWrite = Number.NEGATIVE_INFINITY;
  const now = (value: T) => {
    lastWrite = clock();
    write(value);
  };
  return {
    now,
    throttled: (value) => {
      if (clock() - lastWrite >= intervalMs) now(value);
    },
  };
};
