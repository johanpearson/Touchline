import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./card";

const meta = {
  title: "Components/Card",
  component: Card,
  args: { children: "Next match: home against Kvarnby FF" },
  argTypes: {
    tone: { control: "inline-radio", options: ["surface", "raised"] },
    radius: { control: "inline-radio", options: ["lg", "xl"] },
    padding: { control: "inline-radio", options: ["none", "md", "lg"] },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Raised: Story = { args: { tone: "raised" } };

export const Hero: Story = { args: { radius: "xl", padding: "lg" } };

export const LongSwedishText: Story = {
  args: {
    children:
      "Nästa match: hemma mot Västerås Idrottsförening, avspark lördag klockan femton i den tjugofemte omgången",
  },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};
