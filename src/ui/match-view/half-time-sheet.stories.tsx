import type { Meta, StoryObj } from "@storybook/react-vite";
import { EMPTY_MATCH_CHANGES, getNextFixture, type MatchChanges } from "../../game";
import { changesSourceFor } from "../match-changes-source";
import { careerAfter } from "../test-career";
import { type ChangesEditor, editorAt } from "./half-time-model";
import { HalfTimeSheet } from "./half-time-sheet";

const career = careerAfter(3);
const fixture = getNextFixture(career.season, career.userClubId);
if (!fixture) throw new Error("no fixture for the story career");
const source = changesSourceFor(career, fixture);

const editorFor = (
  moment: { minute: number; halfTime: boolean },
  previous: MatchChanges = EMPTY_MATCH_CHANGES,
  energy: Record<string, number> = {},
): ChangesEditor => editorAt(source(previous), { ...moment, energy });

const halfTime = editorFor({ minute: 45, halfTime: true });

/** Two swaps that share neither player, from the eleven and the bench in order. */
const twoSwaps = () =>
  halfTime.bench.slice(0, 2).map((on, i) => ({ off: halfTime.starters[i + 1] as string, on }));

/** One window used at minute 55, a minute-62 stoppage and some tired legs. */
const inPlay = (() => {
  const used = editorFor({ minute: 55, halfTime: false }).plan({
    subs: twoSwaps().slice(0, 1),
    tactics: halfTime.tactics,
  });
  if (!used.ok) throw new Error("plan");
  const tired = Object.fromEntries(halfTime.starters.map((id, i) => [id, 38 + i * 4]));
  return editorFor({ minute: 62, halfTime: false }, used.changes, tired);
})();

const meta = {
  title: "Screens/Match changes",
  component: HalfTimeSheet,
  // Shot at both widths (side drawer and full-height bottom sheet), in every theme and in Swedish.
  tags: ["theme-wide", "i18n-wide"],
  // A portal-only story would leave the story root empty; the page behind the sheet is a plain block.
  render: (args) => (
    <div className="min-h-dvh">
      <HalfTimeSheet {...args} />
    </div>
  ),
  args: { editor: halfTime, open: true, onOpenChange: () => {}, onApply: () => {} },
} satisfies Meta<typeof HalfTimeSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoChanges: Story = {};

export const TwoPending: Story = {
  args: { initial: { pending: { subs: twoSwaps(), tactics: halfTime.tactics } } },
};

export const WithError: Story = {
  args: {
    initial: {
      pending: { subs: twoSwaps(), tactics: halfTime.tactics },
      error: "too-many-windows",
    },
  },
};

/** Opened while paused at minute 62: windows left, live energy and the apply button. */
export const WhilePaused: Story = { args: { editor: inPlay } };

export const WhilePausedWithShout: Story = {
  args: {
    editor: inPlay,
    initial: { pending: { subs: [], tactics: inPlay.tactics, shout: "pushUp" } },
  },
};
