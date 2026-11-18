import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlayerRatingBadge } from "./player-rating-badge";

const meta = {
  title: "Tactics/PlayerRatingBadge",
  component: PlayerRatingBadge,
  tags: ["i18n-wide", "theme-wide"],
  args: { rating: 14.3, fitness: 88, layout: "compact", tone: "surface" },
  argTypes: {
    layout: { control: "inline-radio", options: ["compact", "inline"] },
    tone: { control: "inline-radio", options: ["surface", "stage"] },
  },
} satisfies Meta<typeof PlayerRatingBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LowFitness: Story = { args: { rating: 11.2, fitness: 38 } };

export const Inline: Story = { args: { layout: "inline" } };

export const InlineLowFitness: Story = { args: { layout: "inline", rating: 11.2, fitness: 38 } };

/** On the pitch stage, which is dark in every theme. */
export const OnStage: Story = {
  args: { tone: "stage" },
  render: (args) => (
    <div
      className="flex gap-8 rounded-xl p-6"
      style={{ background: "radial-gradient(circle at 50% 35%, var(--stage-glow), var(--stage))" }}
    >
      <PlayerRatingBadge {...args} />
      <PlayerRatingBadge {...args} rating={9.8} fitness={30} />
    </div>
  ),
};

/** The three situations side by side: in position, out of position (lower number) and tired. */
export const Comparison: Story = {
  render: () => (
    <div className="flex items-start gap-8">
      <PlayerRatingBadge rating={14.3} fitness={92} />
      <PlayerRatingBadge rating={12.9} fitness={92} />
      <PlayerRatingBadge rating={12.4} fitness={34} />
    </div>
  ),
};
