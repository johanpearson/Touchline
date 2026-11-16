import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "Components/Button",
  tags: ["i18n-wide", "theme-wide"],
  component: Button,
  args: { children: "Play next match", variant: "primary", size: "md" },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "ghost", "destructive"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="primary">
        Primary
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="destructive">
        Destructive
      </Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
};

export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      <Plus aria-hidden="true" className="size-4" />
      Add player
    </Button>
  ),
};

export const Disabled: Story = { args: { disabled: true } };

export const Loading: Story = { args: { loading: true, loadingLabel: "Saving", children: "Save" } };

export const Focused: Story = {
  play: ({ canvasElement }) => {
    canvasElement.querySelector("button")?.focus();
  },
};

/** The Swedish label is much longer; the button grows instead of clipping. */
export const LongSwedishLabel: Story = {
  args: { children: "Fortsätt till nästa omgång och förbered laguppställningen" },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};
