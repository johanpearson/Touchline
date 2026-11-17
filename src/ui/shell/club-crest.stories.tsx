import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClubCrest } from "./club-crest";

const meta = {
  title: "Shell/ClubCrest",
  component: ClubCrest,
  args: { shortName: "KVA", colours: { primary: "#123456", secondary: "#f2e94e" }, size: 64 },
} satisfies Meta<typeof ClubCrest>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A light primary colour switches the initials to dark text. */
export const LightClub: Story = {
  args: { shortName: "VÄS", colours: { primary: "#f2e94e", secondary: "#1b5e20" } },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-4">
      <ClubCrest {...args} size={24} />
      <ClubCrest {...args} size={40} />
      <ClubCrest {...args} size={96} />
    </div>
  ),
};
