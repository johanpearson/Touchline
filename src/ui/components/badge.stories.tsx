import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge";

const meta = {
  title: "Components/Badge",
  component: Badge,
  args: { children: "Fit", tone: "neutral" },
  argTypes: {
    tone: { control: "inline-radio", options: ["neutral", "good", "bad", "info", "warn"] },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge tone="neutral">Neutral</Badge>
      <Badge tone="good">Won</Badge>
      <Badge tone="bad">Lost</Badge>
      <Badge tone="info">Home</Badge>
      <Badge tone="warn">Tired</Badge>
    </div>
  ),
};

export const LongSwedishLabel: Story = {
  args: { children: "Utmattad inför nästa match", tone: "warn" },
};
