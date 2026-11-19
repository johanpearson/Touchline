/**
 * How far ahead of the presentation clock the timeline must reach, in presentation seconds. The
 * engine is advanced until the timeline covers this much, so the next moments are always known.
 */
export const LOOKAHEAD_SECONDS = 4;

/** Match seconds the engine is advanced per step while the timeline is filled up to the lookahead. */
export const ENGINE_STEP_MATCH_SECONDS = 20;
