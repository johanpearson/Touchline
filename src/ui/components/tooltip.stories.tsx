import type { Meta, StoryObj } from "@storybook/react-vite";
import { Settings } from "lucide-react";
import { IconButton } from "./icon-button";
import { Tooltip } from "./tooltip";

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  args: {
    content: "Settings",
    delayDuration: 0,
    children: <IconButton label="Settings" icon={<Settings className="size-5" />} />,
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-32 items-center justify-center">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Keyboard focus opens it too. */
export const Focused: Story = {
  play: ({ canvasElement }) => {
    canvasElement.querySelector("button")?.focus();
  },
};

export const Bottom: Story = { args: { side: "bottom" } };

export const LongSwedishText: Story = {
  args: { content: "Öppna inställningarna för språk, tema och tabelltäthet" },
};
