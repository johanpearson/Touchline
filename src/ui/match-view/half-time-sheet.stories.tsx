import type { Meta, StoryObj } from "@storybook/react-vite";
import { getNextFixture, planHalfTime } from "../../game";
import { careerAfter } from "../test-career";
import type { HalfTimeEditor } from "./half-time-model";
import { HalfTimeSheet } from "./half-time-sheet";

const career = careerAfter(3);
const fixture = getNextFixture(career.season, career.userClubId);
const club = career.league.clubs.find((c) => c.id === career.userClubId);
if (!fixture || !club) throw new Error("no fixture for the story career");

const editor: HalfTimeEditor = {
  players: career.league.players.filter((p) => club.playerIds.includes(p.id)),
  starters: career.squadPlan.starters,
  bench: career.squadPlan.bench,
  condition: career.condition,
  tactics: career.squadPlan.tactics,
  plan: (changes) => planHalfTime(career, fixture, changes),
};

const positionOf = (id: string) => editor.players.find((p) => p.id === id)?.position;

/** Two swaps that share neither player. */
const twoSwaps = () => {
  const used = new Set<string>();
  const swaps: { off: string; on: string }[] = [];
  for (const off of editor.starters) {
    const on = editor.bench.find((id) => positionOf(id) === positionOf(off) && !used.has(id));
    if (on && swaps.length < 2) {
      used.add(on);
      swaps.push({ off, on });
    }
  }
  return swaps;
};

const meta = {
  title: "Screens/Half-time changes",
  component: HalfTimeSheet,
  // Shot at both widths (side drawer and full-height bottom sheet), in every theme and in Swedish.
  tags: ["theme-wide", "i18n-wide"],
  // A portal-only story would leave the story root empty; the page behind the sheet is a plain block.
  render: (args) => (
    <div className="min-h-dvh">
      <HalfTimeSheet {...args} />
    </div>
  ),
  args: { editor, open: true, onOpenChange: () => {}, onResume: () => {} },
} satisfies Meta<typeof HalfTimeSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoChanges: Story = {};

export const TwoPending: Story = {
  args: { initial: { pending: { subs: twoSwaps(), tactics: editor.tactics } } },
};

export const WithError: Story = {
  args: {
    initial: {
      pending: { subs: twoSwaps(), tactics: editor.tactics },
      error: "position-mismatch",
    },
  },
};
