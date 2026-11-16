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
