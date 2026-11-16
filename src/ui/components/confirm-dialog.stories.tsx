import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { ConfirmDialog } from "./confirm-dialog";

const meta = {
  title: "Components/ConfirmDialog",
  tags: ["i18n-wide"],
  component: ConfirmDialog,
  args: {
    open: true,
    title: "Delete this save?",
    description: "This cannot be undone.",
    confirmLabel: "Delete",
    cancelLabel: "Keep it",
    closeLabel: "Close",
    onConfirm: () => {},
    trigger: <Button>Delete save</Button>,
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Destructive: Story = { args: { destructive: true } };

export const Neutral: Story = {
  args: { title: "Start the match?", description: undefined, confirmLabel: "Start" },
};

export const Busy: Story = { args: { destructive: true, busy: true } };

export const LongSwedishStrings: Story = {
  args: {
    destructive: true,
    title: "Vill du verkligen ta bort den här sparade karriären?",
    confirmLabel: "Ja, ta bort karriären",
    cancelLabel: "Nej, behåll den",
  },
};
