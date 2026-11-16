import type { Meta, StoryObj } from "@storybook/react-vite";
import { KitIcon } from "./kit-icon";

const meta = {
  title: "Shell/KitIcon",
  component: KitIcon,
  args: { kit: { body: "#aa1e1e", trim: "#f5f5f5" }, size: 64 },
} satisfies Meta<typeof KitIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Home: Story = {};

export const Away: Story = { args: { kit: { body: "#f5f5f5", trim: "#aa1e1e" } } };
