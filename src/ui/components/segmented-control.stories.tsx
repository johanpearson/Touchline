import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SegmentedControl, type SegmentedOption } from "./segmented-control";

const SIZES: SegmentedOption<string>[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "huge", label: "Huge" },
];

const meta = {
  title: "Components/SegmentedControl",
  tags: ["i18n-wide"],
  component: SegmentedControl<string>,
  args: { label: "Size", options: SIZES, value: "small", onValueChange: () => {} },
} satisfies Meta<typeof SegmentedControl<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

function Stateful(args: Story["args"]) {
  const [value, setValue] = useState(args?.value ?? "small");
  return (
    <SegmentedControl
      label={args?.label ?? "Size"}
      options={args?.options ?? SIZES}
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
  args: { options: SIZES.map((o) => (o.value === "large" ? { ...o, disabled: true } : o)) },
  render: (args) => <Stateful {...args} />,
};

export const Focused: Story = {
  render: (args) => <Stateful {...args} />,
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLElement>("[role='radio'][tabindex='0']")?.focus();
  },
};

/** The playback mode control of the match screen: a label with a second, smaller line. */
export const WithDescriptions: Story = {
  args: {
    label: "Playback mode",
    value: "extended",
    options: [
      { value: "highlights", label: "Highlights", description: "about 2 minutes" },
      { value: "extended", label: "Extended", description: "about 4 minutes" },
      { value: "full", label: "Full match", description: "about 8 minutes" },
    ],
  },
  render: (args) => <Stateful {...args} />,
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
