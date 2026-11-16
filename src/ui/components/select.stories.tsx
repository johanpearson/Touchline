import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select, type SelectOption } from "./select";

const LANGUAGES: SelectOption[] = [
  { value: "en", label: "English" },
  { value: "sv", label: "Svenska" },
  { value: "de", label: "Deutsch (coming later)", disabled: true },
];

const meta = {
  title: "Components/Select",
  component: Select,
  args: { label: "Language", options: LANGUAGES, defaultValue: "en" },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Placeholder: Story = {
  args: { defaultValue: undefined, placeholder: "Choose a language" },
};

export const WithHintAndError: Story = {
  args: { defaultValue: undefined, hint: "Saved with the career", error: "Choose a language" },
};

export const Disabled: Story = { args: { disabled: true } };

/** Long Swedish option text is cut with an ellipsis in the trigger and the list; the full text is the `title`. */
export const LongSwedishOptions: Story = {
  args: {
    label: "Spelsätt för nästa omgång",
    defaultValue: "a",
    options: [
      { value: "a", label: "Spela hela matchen och förbered laguppställningen i förväg" },
      { value: "b", label: "Snabbsimulera omgången utan att titta på matchen" },
    ],
  },
};
