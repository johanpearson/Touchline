import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ZoneEvent } from "../../engine";
import { MomentumChart } from "./momentum-chart";

const event = (time: number, team: "home" | "away", intensity: number, type = "progress") =>
  ({
    type,
    team,
    time,
    position: { x: 0.6, y: 0.5 },
    intensity,
    ...(type === "goal" ? { xg: 0.3 } : {}),
  }) as ZoneEvent;

/** A deterministic, uneven match: home on top early, away after the break, three goals. */
const typicalMatch = (): ZoneEvent[] => {
  const events: ZoneEvent[] = [];
  for (let time = 15; time < 4200; time += 25) {
    const wave = Math.sin(time / 420);
    const team = wave + (time > 2700 ? -0.6 : 0.3) >= 0 ? "home" : "away";
    events.push(event(time, team, 0.35 + 0.35 * Math.abs(Math.sin(time / 97))));
  }
  events.push(event(1260, "home", 0.9, "goal"), event(2580, "home", 0.9, "goal"));
  events.push(event(3300, "away", 0.9, "goal"));
  events.push({
    type: "periodChange",
    team: "home",
    time: 2760,
    position: { x: 0.5, y: 0.5 },
    intensity: 0,
    period: "halfTime",
  } as ZoneEvent);
  return events.sort((a, b) => a.time - b.time);
};

const meta = {
  title: "Match/Momentum chart",
  component: MomentumChart,
  // Shot on desktop and phone, in every theme and in Swedish.
  tags: ["theme-wide", "i18n-wide"],
  args: {
    homeColour: "#d33a2f",
    awayColour: "#2f6fd3",
    names: { home: "Kvarnby", away: "Västerås" },
    events: [],
    matchTime: 0,
  },
} satisfies Meta<typeof MomentumChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypicalMatch: Story = { args: { events: typicalMatch(), matchTime: 4200 } };

export const EmptyMatch: Story = { args: { events: [], matchTime: 0 } };
