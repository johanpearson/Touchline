import type { Meta, StoryObj } from "@storybook/react-vite";
import { DensityPreview } from "./density-preview";

const meta = {
  title: "Settings/DensityPreview",
  component: DensityPreview,
  decorators: [
    (Story) => (
      <div className="max-w-[420px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DensityPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Compact: Story = { args: { density: "compact" } };
export const Comfortable: Story = { args: { density: "comfortable" } };
