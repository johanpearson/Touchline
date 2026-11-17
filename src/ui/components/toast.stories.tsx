import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { type ToastInput, ToastProvider, useToast } from "./toast";

function Launcher({ inputs }: { inputs: ToastInput[] }) {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      {inputs.map((input) => (
        <Button key={`${input.tone}-${input.title}`} onClick={() => toast(input)}>
          {input.title}
        </Button>
      ))}
    </div>
  );
}

const meta = {
  title: "Components/Toast",
  component: Launcher,
  decorators: [
    (Story) => (
      <ToastProvider dismissLabel="Dismiss" viewportLabel="Notifications (F8)">
        <Story />
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof Launcher>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Success closes itself after five seconds; errors stay until dismissed. */
export const AllTones: Story = {
  args: {
    inputs: [
      { title: "Saved", description: "Career saved.", tone: "success" },
      { title: "Save failed", description: "Storage is full.", tone: "error" },
      { title: "New round", tone: "info" },
    ],
  },
};

export const LongSwedishText: Story = {
  args: {
    inputs: [
      {
        title: "Karriären kunde inte sparas",
        description:
          "Webbläsarens lagringsutrymme är fullt, exportera filen och rensa gamla sparningar.",
        tone: "error",
      },
    ],
  },
};
