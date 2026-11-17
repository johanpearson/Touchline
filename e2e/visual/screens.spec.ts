import { SCREEN_STATES } from "./screen-states";
import { visualScreen } from "./visual-screen";

// The states are registered in screen-states.ts, which the accessibility audit (#272) reads too.
for (const state of SCREEN_STATES) visualScreen(state);
