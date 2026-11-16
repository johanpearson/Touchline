import type { Meta, StoryObj } from "@storybook/react-vite";
import { Inbox } from "lucide-react";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

const meta = {
  title: "Components/EmptyState",
  tags: ["i18n-wide"],
  component: EmptyState,
  args: {
    icon: <Inbox className="size-10" />,
    title: "No saved careers",
    text: "Start a new career and it will appear here.",
    action: <Button variant="primary">New career</Button>,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TitleOnly: Story = { args: { icon: undefined, text: undefined, action: undefined } };

export const LongSwedishText: Story = {
  args: {
    title: "Inga sparade karriärer ännu",
    text: "Starta en ny karriär så dyker den upp här, tillsammans med klubbens placering och senaste sparning.",
    action: <Button variant="primary">Starta en ny karriär</Button>,
  },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};
