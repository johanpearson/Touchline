import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SegmentedControl, type SegmentedOption } from "./segmented-control";

const SPEEDS: SegmentedOption<string>[] = [
  { value: "x1", label: "x1" },
  { value: "x2", label: "x2" },
  { value: "x4", label: "x4" },
  { value: "x8", label: "x8" },
];

const meta = {
  title: "Components/SegmentedControl",
  tags: ["i18n-wide"],
  component: SegmentedControl<string>,
  args: { label: "Speed", options: SPEEDS, value: "x1", onValueChange: () => {} },
} satisfies Meta<typeof SegmentedControl<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

function Stateful(args: Story["args"]) {
  const [value, setValue] = useState(args?.value ?? "x1");
  return (
    <SegmentedControl
      label={args?.label ?? "Speed"}
      options={args?.options ?? SPEEDS}
      value={value}
      onValueChange={setValue}
    />
  );
}

export const Default: Story = { render: (args) => <Stateful {...args} /> };

export const View: Story = {
  args: {
    label: "View",
    value: "terrain",
    options: [
      { value: "terrain", label: "Terrain" },
      { value: "2d", label: "2D" },
    ],
  },
  render: (args) => <Stateful {...args} />,
};

export const WithDisabledOption: Story = {
  args: { options: SPEEDS.map((o) => (o.value === "x4" ? { ...o, disabled: true } : o)) },
  render: (args) => <Stateful {...args} />,
};

export const Focused: Story = {
  render: (args) => <Stateful {...args} />,
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLElement>("[role='radio'][tabindex='0']")?.focus();
  },
};

/** Long Swedish labels widen the segments; the group wraps on a narrow screen instead of clipping. */
export const LongSwedishLabels: Story = {
  args: {
    label: "Täthet",
    value: "compact",
    options: [
      { value: "compact", label: "Kompakt" },
      { value: "comfortable", label: "Bekväm radhöjd" },
      { value: "spacious", label: "Extra luftig radhöjd" },
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
  render: (args) => <Stateful {...args} />,
};
