import type { Meta, StoryObj } from "@storybook/react-vite";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { createMemoryDensityStore } from "../../platform";
import { DensityProvider, useDensity } from "../theme/density-provider";
import { Badge } from "./badge";
import { DataTable } from "./data-table";
import type { Column } from "./data-table-logic";
import { EmptyState } from "./empty-state";
import { SegmentedControl } from "./segmented-control";

type Club = {
  id: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
  mine?: boolean;
};

const NAMES = [
  "Kvarnby",
  "Västerås Vikings",
  "Örnsköldsvik FC",
  "Skogsmark",
  "Hamnstad",
  "Björkdalen",
  "Strandvik",
  "Norrfjärden",
  "Ängelholm United",
  "Solgläntan",
  "Bergslagen IF",
  "Lindesberg",
  "Kustens BK",
  "Fjällbacka",
];

const CLUBS: Club[] = NAMES.map((name, i) => {
  const won = 14 - i;
  const drawn = (i * 3) % 6;
  const lost = 26 - won - drawn;
  return {
    id: `club-${i}`,
    name,
    played: 26,
    won,
    drawn,
    lost,
    gf: 48 - i * 2,
    ga: 20 + i * 2,
    points: won * 3 + drawn,
    mine: i === 2,
  };
});

const num = (key: keyof Club, header: string, priority: 1 | 2 | 3): Column<Club> => ({
  id: key,
  header,
  cell: (c) => String(c[key]),
  sortValue: (c) => Number(c[key]),
  align: "end",
  priority,
});

const LEAGUE_COLUMNS: Column<Club>[] = [
  {
    id: "name",
    header: "Club",
    cell: (c) => c.name,
    sortValue: (c) => c.name,
    priority: 1,
    primary: true,
  },
  num("played", "P", 2),
  num("won", "W", 3),
  num("drawn", "D", 3),
  num("lost", "L", 3),
  num("gf", "GF", 3),
  num("ga", "GA", 3),
  num("points", "Pts", 1),
];

const SV_COLUMNS: Column<Club>[] = LEAGUE_COLUMNS.map((c) => ({
  ...c,
  header:
    {
      name: "Klubb och lagets fullständiga namn",
      played: "Spelade matcher",
      points: "Poäng i tabellen",
    }[c.id] ?? c.header,
}));

type Player = {
  id: string;
  name: string;
  position: string;
  age: number;
  overall: number;
  form: number;
};

const POSITIONS = ["Goalkeepers", "Defenders", "Midfielders", "Forwards"] as const;
const PLAYERS: Player[] = Array.from({ length: 22 }, (_, i) => ({
  id: `p-${i}`,
  name: `Spelare ${String.fromCharCode(65 + (i % 26))}ström ${i + 1}`,
  position: POSITIONS[i < 3 ? 0 : i < 9 ? 1 : i < 16 ? 2 : 3] ?? "Forwards",
  age: 18 + ((i * 7) % 17),
  overall: 55 + ((i * 11) % 30),
  form: 40 + ((i * 13) % 55),
}));

const SQUAD_COLUMNS: Column<Player>[] = [
  {
    id: "name",
    header: "Name",
    cell: (p) => p.name,
    sortValue: (p) => p.name,
    priority: 1,
    primary: true,
  },
  {
    id: "age",
    header: "Age",
    cell: (p) => p.age,
    sortValue: (p) => p.age,
    align: "end",
    priority: 3,
  },
  {
    id: "form",
    header: "Form",
    cell: (p) => p.form,
    sortValue: (p) => p.form,
    align: "end",
    priority: 2,
  },
  {
    id: "overall",
    header: "Overall",
    cell: (p) => <Badge tone={p.overall > 70 ? "good" : "neutral"}>{p.overall}</Badge>,
    sortValue: (p) => p.overall,
    align: "end",
    priority: 1,
  },
];

const LABELS = { sortBy: "Sort by", ascending: "ascending", descending: "descending" };

function WithDensity({
  children,
}: {
  children: (density: "compact" | "comfortable") => ReactNode;
}) {
  const { density, setDensity } = useDensity();
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        label="Density"
        value={density}
        onValueChange={setDensity}
        options={[
          { value: "compact", label: "Compact" },
          { value: "comfortable", label: "Comfortable" },
        ]}
      />
      {children(density)}
    </div>
  );
}

const meta = {
  title: "Components/DataTable",
  decorators: [
    (Story) => (
      <DensityProvider store={createMemoryDensityStore()}>
        <Story />
      </DensityProvider>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** 14 clubs; the user's club has an edge accent. Resize the canvas to see columns hide by priority. */
export const LeagueTable: Story = {
  render: () => (
    <WithDensity>
      {(density) => (
        <DataTable
          label="League table"
          columns={LEAGUE_COLUMNS}
          rows={CLUBS}
          rowKey={(c) => c.id}
          labels={LABELS}
          density={density}
          locale="en"
          defaultSort={{ id: "points", direction: "desc" }}
          tieBreak={(c) => c.name}
          highlight={(c) => c.mine === true}
          accent={() => "var(--accent)"}
        />
      )}
    </WithDensity>
  ),
};

/** 22 players grouped by position; sorting stays inside each group. */
export const SquadWithGroups: Story = {
  render: () => (
    <WithDensity>
      {(density) => (
        <DataTable
          label="Squad"
          columns={SQUAD_COLUMNS}
          rows={PLAYERS}
          rowKey={(p) => p.id}
          labels={LABELS}
          density={density}
          locale="sv"
          groupBy={(p) => p.position}
        />
      )}
    </WithDensity>
  ),
};

export const Empty: Story = {
  render: () => (
    <DataTable
      label="Fixtures"
      columns={LEAGUE_COLUMNS}
      rows={[]}
      rowKey={(c) => c.id}
      labels={LABELS}
      empty={
        <EmptyState icon={<Inbox />} title="No fixtures yet" text="Start a season to see them." />
      }
    />
  ),
};

/** Long Swedish headers: the table scrolls inside its container with a sticky first column. */
export const LongSwedishHeaders: Story = {
  render: () => (
    <DataTable
      label="Tabell"
      columns={SV_COLUMNS}
      rows={CLUBS}
      rowKey={(c) => c.id}
      labels={{ sortBy: "Sortera efter", ascending: "stigande", descending: "fallande" }}
      locale="sv"
    />
  ),
};

/** Below 640 px the rows become cards; this story forces them regardless of the canvas width. */
export const CardMode: Story = {
  render: () => (
    <div className="max-w-sm">
      <DataTable
        label="League table"
        columns={LEAGUE_COLUMNS}
        rows={CLUBS}
        rowKey={(c) => c.id}
        labels={LABELS}
        locale="en"
        cards
        highlight={(c) => c.mine === true}
      />
    </div>
  ),
};
