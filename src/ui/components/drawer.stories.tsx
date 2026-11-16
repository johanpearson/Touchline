import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Drawer } from "./drawer";

const meta = {
  title: "Components/Drawer",
  component: Drawer,
  parameters: { viewport: { defaultViewport: "responsive" } },
  args: {
    title: "More",
    description: "Screens that do not fit in the tab bar.",
    closeLabel: "Close",
    defaultOpen: true,
    trigger: <Button>Open drawer</Button>,
    children: (
      <ul className="flex flex-col gap-2 text-soft">
        <li>Club</li>
        <li>Saves</li>
        <li>Settings</li>
      </ul>
    ),
  },
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A side sheet from 640 px, a bottom sheet below it: resize the canvas to compare. */
export const Right: Story = {};

export const Left: Story = { args: { side: "left" } };

export const LongSwedishStrings: Story = {
  args: {
    title: "Fler skärmar och inställningar för din klubb",
    description: "Skärmar som inte får plats i den nedre flikraden på en telefon.",
  },
};
