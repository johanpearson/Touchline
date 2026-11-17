import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./card";
import { Skeleton } from "./skeleton";

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  args: { className: "h-4 w-48" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CardPlaceholder: Story = {
  render: () => (
    <Card className="flex max-w-sm flex-col gap-3">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </Card>
  ),
};
