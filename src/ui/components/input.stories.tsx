import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";

const meta = {
  title: "Components/Input",
  component: Input,
  args: { label: "Seed", placeholder: "e.g. 42" },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = { args: { hint: "The same seed always gives the same league" } };

export const WithError: Story = {
  args: { error: "The seed must be a whole number", defaultValue: "4x2" },
};

export const Disabled: Story = { args: { disabled: true, defaultValue: "42" } };

export const Search: Story = {
  args: { variant: "search", label: "Search players", placeholder: "Name or position" },
};

export const Focused: Story = {
  play: ({ canvasElement }) => {
    canvasElement.querySelector("input")?.focus();
  },
};

/** The Swedish label and messages are much longer; they wrap instead of clipping. */
export const LongSwedishText: Story = {
  args: {
    label: "Slumpfrö för att skapa samma serie och samma spelare igen",
    hint: "Samma frö ger alltid samma serie, samma klubbar och samma spelare",
    error: "Fröet måste vara ett heltal mellan noll och fyra miljarder",
  },
};
