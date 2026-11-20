import type { Meta, StoryObj } from "@storybook/react-vite";
import { LeaveMatchDialog } from "./leave-match-dialog";

const meta = {
  title: "Screens/Leave the match",
  component: LeaveMatchDialog,
  // Shot at both widths, in every theme and in Swedish.
  tags: ["theme-wide", "i18n-wide"],
  args: {
    open: true,
    status: "Kvarnby Park 1–0 Rosenfors City, 34’",
    onStay: () => {},
    onSimulate: () => {},
  },
} satisfies Meta<typeof LeaveMatchDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The question asked when the user tries to leave a match in progress; Stay has the focus. */
export const Default: Story = {};

export const LongNames: Story = {
  args: { status: "Östra Sandviken Idrottsförening 12–11 Västerås Norra Fotbollsklubb, 90+4’" },
};
