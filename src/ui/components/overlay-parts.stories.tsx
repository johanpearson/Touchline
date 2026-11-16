import * as RadixDialog from "@radix-ui/react-dialog";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { OverlayActions, OverlayHeader } from "./overlay-parts";

/** The header and actions row shared by Dialog and Drawer, shown inside a bare Radix dialog. */
const meta = {
  title: "Components/OverlayParts",
  component: OverlayHeader,
  args: { title: "Title", description: "Description", closeLabel: "Close", showClose: true },
  render: (args) => (
    <RadixDialog.Root open>
      <RadixDialog.Content className="rounded-xl border border-line bg-raised p-6 text-text">
        <OverlayHeader {...args} />
        <OverlayActions>
          <Button variant="primary">Action</Button>
        </OverlayActions>
      </RadixDialog.Content>
    </RadixDialog.Root>
  ),
} satisfies Meta<typeof OverlayHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithoutClose: Story = { args: { showClose: false } };
