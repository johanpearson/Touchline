import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScrollArea } from "./scroll-area";

const meta = {
  title: "Components/ScrollArea",
  component: ScrollArea,
  args: { label: "Clubs" },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const clubs = Array.from({ length: 24 }, (_, i) => `Club ${i + 1}`);

function Strip({ names = clubs }: { names?: string[] }) {
  return (
    <div className="flex w-max gap-3">
      {names.map((name) => (
        <button
          key={name}
          type="button"
          className="min-h-11 shrink-0 rounded-md border border-line bg-raised px-4 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {name}
        </button>
      ))}
    </div>
  );
}

/** Many items (the strip is `w-max`, so the container padding and fade inset apply at the end too): no scrollbar, scroll with the arrow keys after focusing the strip, or tab through the items. */
export const ManyItems: Story = {
  render: (args) => (
    <ScrollArea {...args} data-testid="strip" className="max-w-md">
      <Strip />
    </ScrollArea>
  ),
};

export const EdgeFade: Story = {
  args: { fade: true },
  render: (args) => (
    <ScrollArea {...args} data-testid="strip" className="max-w-md">
      <Strip />
    </ScrollArea>
  ),
};

export const ScrollSnap: Story = {
  args: { fade: true, snap: true },
  render: (args) => (
    <ScrollArea {...args} data-testid="strip" className="max-w-md">
      <Strip />
    </ScrollArea>
  ),
};

export const Focused: Story = {
  ...ManyItems,
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLElement>("[role='region']")?.focus();
  },
};

export const Vertical: Story = {
  args: { orientation: "vertical", label: "Log" },
  render: (args) => (
    <ScrollArea {...args} data-testid="strip" className="h-40 max-w-xs">
      <ul className="flex flex-col gap-2">
        {clubs.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </ScrollArea>
  ),
};

/** Long Swedish club names make the items wider; the strip scrolls instead of wrapping. */
export const LongSwedishNames: Story = {
  args: { fade: true },
  render: (args) => (
    <ScrollArea {...args} data-testid="strip" className="max-w-md">
      <Strip
        names={[
          "Östersunds Gymnastik- och Idrottsförening",
          "Västerås Sportklubb Fotbollsförening",
          "Jönköpings Södra Idrottsförening",
          "Hammarby Talang Fotbollsförening",
        ]}
      />
    </ScrollArea>
  ),
};
