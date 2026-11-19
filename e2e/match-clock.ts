import type { Locator, Page } from "@playwright/test";

/**
 * A match is paced by the playback director, so a whole match takes minutes of wall-clock time even in
 * Highlights mode. These helpers freeze the page's timers before kick-off and move them by hand: the
 * test then plays a match in a few seconds and the minute it reaches is the same on every run.
 */
const START = new Date("2030-01-15T12:00:00Z");

/** Stops the page's timers. Call it before "kick-off" so the playback interval runs on the frozen clock. */
export const freezeClock = async (page: Page) => {
  await page.clock.install({ time: START });
  await page.clock.pauseAt(new Date(START.getTime() + 1000));
};

/** Lets the timers run on their own again (for example before a page reload). */
export const unfreezeClock = async (page: Page) => {
  await page.clock.resume();
};

/** React renders on a MessageChannel, which the page clock does not fake: a round trip queues behind its render. */
const flushRender = async (page: Page) => {
  for (let round = 0; round < 2; round++) {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = () => resolve();
          channel.port2.postMessage(null);
        }),
    );
  }
};

/**
 * Moves the frozen page clock forward and lets React render what the ticks published. It jumps
 * (`fastForward`) instead of running every timer in between: `runFor` would also run every animation
 * frame of the terrain, which is far slower than the match itself. The playback hook takes the jump as
 * one long tick, so the match lands on the same frame on every run.
 */
export const advanceClock = async (page: Page, milliseconds: number) => {
  await page.clock.fastForward(milliseconds);
  await flushRender(page);
};

const STEP_MS = 5000;
const LIMIT_MS = 600_000;

/** Moves the frozen page clock in steps until `target` is visible; throws if a match's worth of time passes first. */
export const playUntilVisible = async (page: Page, target: Locator) => {
  for (let elapsed = 0; elapsed < LIMIT_MS; elapsed += STEP_MS) {
    if (await target.isVisible()) return;
    await advanceClock(page, STEP_MS);
  }
  throw new Error(`${target} did not appear after ${LIMIT_MS / 1000} seconds of match time`);
};

/** Chooses a playback mode by its control. */
export const chooseMode = async (page: Page, mode: "highlights" | "extended" | "full") => {
  await page.getByTestId(`mode-${mode}`).click();
};
