import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "./button";
import { ChangeFlash } from "./change-flash";

const meta = {
  title: "Components/ChangeFlash",
  component: ChangeFlash,
  args: { value: 12, children: "12" },
} satisfies Meta<typeof ChangeFlash>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Press the button: the number changes at once and its background glows briefly. */
export const Changing: Story = {
  render: () => {
    const [points, setPoints] = useState(12);
    return (
      <div className="flex items-center gap-4">
        <ChangeFlash value={points} className="px-2 text-2xl tabular-nums">
          {points}
        </ChangeFlash>
        <Button onClick={() => setPoints(points + 3)}>Win</Button>
      </div>
    );
  },
};
