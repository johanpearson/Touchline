import { visualScreen } from "./visual-screen";

// Key states of screens. Each screen issue adds its own states here (#253 registers the first one).
visualScreen({ name: "new-career", route: "#/" });

// The app shell around the career hub (#254): sidebar, icon rail and bottom tabs by width.
visualScreen({
  name: "app-shell-hub",
  route: "#/",
  state: async (page) => {
    await page.getByTestId("club-name").first().click();
    await page.getByTestId("start-career").click();
    await page.getByTestId("career-hub").waitFor();
  },
});

// The command palette (#255) open over the hub, with a query that matches clubs and players.
visualScreen({
  name: "command-palette",
  route: "#/",
  state: async (page) => {
    await page.getByTestId("club-name").first().click();
    await page.getByTestId("start-career").click();
    await page.getByTestId("career-hub").waitFor();
    await page.getByTestId("palette-open").click();
    await page.getByTestId("palette-input").fill("a");
    await page.getByTestId("command-palette").waitFor();
    // Let the open animation finish (the screenshot disables animations, so this is a safety net).
    await page.getByRole("listbox").waitFor();
  },
});
