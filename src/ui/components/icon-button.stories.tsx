import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus, Settings, Trash2 } from "lucide-react";
import { IconButton } from "./icon-button";

const meta = {
  title: "Components/IconButton",
  component: IconButton,
  args: { label: "Add player", icon: <Plus className="size-5" />, variant: "ghost", size: "md" },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "ghost", "destructive"] },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <IconButton {...args} variant="primary" label="Add" icon={<Plus className="size-5" />} />
      <IconButton
        {...args}
        variant="secondary"
        label="Settings"
        icon={<Settings className="size-5" />}
      />
      <IconButton {...args} variant="ghost" label="Add" icon={<Plus className="size-5" />} />
      <IconButton
        {...args}
        variant="destructive"
        label="Delete"
        icon={<Trash2 className="size-5" />}
      />
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <IconButton {...args} size="sm" />
      <IconButton {...args} size="md" />
      <IconButton {...args} size="lg" />
    </div>
  ),
};

export const Disabled: Story = { args: { disabled: true } };

export const Focused: Story = {
  play: ({ canvasElement }) => {
    canvasElement.querySelector("button")?.focus();
  },
};
