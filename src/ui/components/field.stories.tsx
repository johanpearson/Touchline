import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field } from "./field";
import { fieldControlStyles } from "./field-styles";

const meta = {
  title: "Components/Field",
  component: Field,
  args: { label: "Club name", children: () => null },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `Field` links a label, hint and error to any control placed inside it. */
export const Default: Story = {
  args: { hint: "Shown on the scoreboard", error: "Enter a name" },
  render: (args) => (
    <Field {...args} className="max-w-sm">
      {(control) => <input {...control} className={fieldControlStyles} />}
    </Field>
  ),
};
