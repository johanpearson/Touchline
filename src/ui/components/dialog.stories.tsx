import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Dialog } from "./dialog";

const meta = {
  title: "Components/Dialog",
  component: Dialog,
  args: {
    title: "Rename career",
    description: "Pick a name you will recognise in the list of saves.",
    closeLabel: "Close",
    defaultOpen: true,
    trigger: <Button>Open dialog</Button>,
    actions: <Button variant="primary">Save</Button>,
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: <p className="text-soft">Dialog body content.</p> },
};

export const Destructive: Story = {
  args: {
    destructive: true,
    title: "Delete this save?",
    description: "It cannot be restored.",
    actions: <Button variant="destructive">Delete</Button>,
  },
};

/** Swedish strings are longer; the dialog wraps instead of clipping. */
export const LongSwedishStrings: Story = {
  args: {
    title: "Vill du verkligen ta bort den här sparade karriären permanent?",
    description:
      "Alla omgångar, spelare och resultat försvinner och går inte att få tillbaka efteråt.",
    actions: <Button variant="destructive">Ja, ta bort karriären för alltid</Button>,
  },
};
