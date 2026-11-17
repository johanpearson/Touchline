import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Career } from "../game";
import { createMemoryDensityStore } from "../platform";
import { ClubView } from "./club-screen";
import { careerAfter } from "./test-career";
import { DensityProvider } from "./theme/density-provider";

const withColours = (career: Career, primary: string, secondary: string): Career => ({
  ...career,
  league: {
    ...career.league,
    clubs: career.league.clubs.map((club) =>
      club.id === career.userClubId ? { ...club, colours: { primary, secondary } } : club,
    ),
  },
});

const career = careerAfter(3);

const meta = {
  title: "Screens/Club",
  component: ClubView,
  // Shot at both widths, in every theme and in Swedish: club colours must never carry text.
  tags: ["theme-wide", "i18n-wide"],
  decorators: [
    (Story) => (
      <DensityProvider store={createMemoryDensityStore(null)}>
        <Story />
      </DensityProvider>
    ),
  ],
  args: { career, clubId: career.userClubId },
} satisfies Meta<typeof ClubView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UserClub: Story = {};

/** A white club on a light theme: the edge accent, crest outline and kit swatches stay visible. */
export const LightColouredClub: Story = {
  args: { career: withColours(career, "#ffffff", "#fff59d"), clubId: career.userClubId },
};

/** A black club on a dark theme. */
export const DarkColouredClub: Story = {
  args: { career: withColours(career, "#000000", "#0a0a0a"), clubId: career.userClubId },
};
