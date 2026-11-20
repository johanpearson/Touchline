import type { Meta, StoryObj } from "@storybook/react-vite";
import type { LineupRow } from "./lineup-rows";
import { LineupsPanel } from "./lineups-panel";

const names = ["Ek", "Berg", "Lind", "Strand", "Nyström", "Holm", "Sjöberg", "Dahl"];

const row = (
  side: "home" | "away",
  index: number,
  overrides: Partial<LineupRow> = {},
): LineupRow => ({
  id: `${side}${index}`,
  name: names[index] ?? `Player ${index}`,
  side,
  status: "pitch",
  position: index === 0 ? "GK" : index < 4 ? "DEF" : index < 7 ? "MID" : "FWD",
  rating: 13.4 - index * 0.3,
  energy: 100 - index * 6,
  tired: false,
  goals: 0,
  matchRating: 6.4,
  ...overrides,
});

const home = [
  row("home", 0),
  row("home", 1),
  row("home", 2, { energy: 38, rating: 10.1, tired: true }),
  row("home", 3, { goals: 1, matchRating: 7.8 }),
  row("home", 4, { status: "bench", energy: 100, rating: 12.2 }),
  row("home", 5, { status: "off", energy: 31, rating: 9.4 }),
];
const away = [row("away", 0), row("away", 1), row("away", 2, { energy: 47, tired: true })];

const meta = {
  title: "Match/LineupsPanel",
  component: LineupsPanel,
  tags: ["i18n-wide", "theme-wide"],
  args: {
    rows: { home, away },
    teamNames: { home: "Kvarnby", away: "Västerås" },
    colours: { home: "#ff4b5c", away: "#2f9bff" },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md bg-surface p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LineupsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pitch, bench and a substituted-off player (greyed, last); tired players carry a warning shape and text. */
export const Default: Story = {};
