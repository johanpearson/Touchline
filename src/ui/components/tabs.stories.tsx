import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="stats">
      <TabsList aria-label="Match panel">
        <TabsTrigger value="stats">Stats</TabsTrigger>
        <TabsTrigger value="feed">Feed</TabsTrigger>
        <TabsTrigger value="lineups">Lineups</TabsTrigger>
      </TabsList>
      <TabsContent value="stats" className="p-4">
        Possession, shots and xG.
      </TabsContent>
      <TabsContent value="feed" className="p-4">
        Commentary lines.
      </TabsContent>
      <TabsContent value="lineups" className="p-4">
        Both elevens.
      </TabsContent>
    </Tabs>
  ),
};

export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="table">
      <TabsList aria-label="League views">
        <TabsTrigger value="table">Table</TabsTrigger>
        <TabsTrigger value="fixtures" disabled>
          Fixtures
        </TabsTrigger>
        <TabsTrigger value="form">Form</TabsTrigger>
      </TabsList>
      <TabsContent value="table" className="p-4">
        The league table.
      </TabsContent>
    </Tabs>
  ),
};

export const Focused: Story = {
  ...Default,
  play: ({ canvasElement }) => {
    canvasElement.querySelector<HTMLElement>("[role='tab'][data-state='active']")?.focus();
  },
};

/** Swedish labels are longer; the list stays on one line and the tabs keep their 44 px height. */
export const LongSwedishLabels: Story = {
  render: () => (
    <Tabs defaultValue="a">
      <TabsList aria-label="Matchpanel">
        <TabsTrigger value="a">Statistik och nyckeltal</TabsTrigger>
        <TabsTrigger value="b">Kommentarer från matchen</TabsTrigger>
        <TabsTrigger value="c">Laguppställningar</TabsTrigger>
      </TabsList>
      <TabsContent value="a" className="p-4">
        Statistik.
      </TabsContent>
    </Tabs>
  ),
};
