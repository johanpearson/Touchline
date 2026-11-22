import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChanceCue } from "./chance-cue";

const meta = {
  title: "Match/ChanceCue",
  component: ChanceCue,
  tags: ["i18n-wide", "theme-wide"],
  args: {
    moment: { stage: "reaction", result: "saved", team: "home", shooter: "s9", keeper: "k1" },
    teamNames: { home: "Kvarnby", away: "Västerås" },
    colours: { home: "#ff4b5c", away: "#2f9bff" },
    players: { s9: "Dahl", k1: "Ek" },
  },
  decorators: [
    (Story) => (
      <div className="relative mx-auto h-40 w-full max-w-md rounded-xl border border-line bg-stage">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChanceCue>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The keeper keeps the shot out: the reaction line names the keeper. */
export const Saved: Story = {};

/** The ball is played to the creator of a clear chance. */
export const Building: Story = {
  args: { moment: { stage: "creator", result: "goal", team: "away", shooter: "s9", keeper: "k1" } },
};

/** A goal: the celebration beat. */
export const Goal: Story = {
  args: {
    moment: { stage: "reaction", result: "goal", team: "home", shooter: "s9", keeper: "k1" },
  },
};

/** A near miss, off the woodwork: disappointment for the taker. */
export const Woodwork: Story = {
  args: {
    moment: { stage: "reaction", result: "woodwork", team: "away", shooter: "s9", keeper: "k1" },
  },
};
