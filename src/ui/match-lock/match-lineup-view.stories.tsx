import type { Meta, StoryObj } from "@storybook/react-vite";
import { careerAfter } from "../test-career";
import { MatchLineupView } from "./match-lineup-view";

const meta = {
  title: "Screens/Match lineup panel",
  component: MatchLineupView,
  // Shot at both widths, in every theme and in Swedish.
  tags: ["theme-wide", "i18n-wide"],
  args: { career: careerAfter(3) },
  render: (args) => (
    <div className="max-w-xl p-4">
      <MatchLineupView {...args} />
    </div>
  ),
} satisfies Meta<typeof MatchLineupView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The read-only lineup and tactics the squad and tactics panels show during a match. */
export const Default: Story = {};
