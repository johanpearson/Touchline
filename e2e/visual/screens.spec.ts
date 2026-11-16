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

// The home dashboard (#259): first matchday (empty table) and after four quick-simmed matchdays.
const startCareerAtHub = async (page: import("@playwright/test").Page) => {
  await page.getByTestId("club-name").first().click();
  await page.getByTestId("start-career").click();
  await page.getByTestId("career-hub").waitFor();
};

visualScreen({ name: "hub-first-matchday", route: "#/", state: startCareerAtHub });

visualScreen({
  name: "hub-mid-season",
  route: "#/",
  state: async (page) => {
    await startCareerAtHub(page);
    for (let i = 0; i < 4; i++) {
      await page.getByTestId("quick-sim").click();
      await page.goto(`${page.url().split("#")[0]}#/`);
      await page.getByTestId("career-hub").waitFor();
    }
  },
});
