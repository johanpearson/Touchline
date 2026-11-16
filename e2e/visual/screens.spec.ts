import type { Page } from "@playwright/test";
import { visualScreen } from "./visual-screen";

const APP = "http://localhost:4174/Touchline/";

// Key states of screens. Each screen issue adds its own states here (#253 registers the first one).

// The new-career wizard: step 1 (#257) and step 2, the club picker (#258).
visualScreen({ name: "new-career-league", route: "#/new", full: true });

// Scoped to the club strip: the theme and language selects in the shell also expose `option` roles.
const clubOptions = (page: Page) => page.getByTestId("club-strip").getByRole("option");

const openClubStep = async (page: Page) => {
  await page.getByTestId("choose-club").click();
  await page.getByTestId("club-card").waitFor();
};

// Language-neutral: pick strip options by position or by the longest name.
visualScreen({
  name: "new-career-club-easy",
  route: "#/new",
  state: openClubStep,
});

visualScreen({
  name: "new-career-club-very-hard",
  route: "#/new",
  state: async (page) => {
    await openClubStep(page);
    await clubOptions(page).last().click();
  },
});

visualScreen({
  name: "new-career-club-long-name",
  full: true,
  route: "#/new",
  state: async (page) => {
    await openClubStep(page);
    const names = await page.getByTestId("club-option-name").allTextContents();
    const longest = names.reduce(
      (best, name, i) => (name.length > (names[best]?.length ?? 0) ? i : best),
      0,
    );
    await clubOptions(page).nth(longest).click();
  },
});

// The start screen (#256): nothing saved, a continue card with saved careers, and a damaged autosave.
visualScreen({
  name: "start-empty",
  route: "#/",
  state: async (page) => {
    await page.getByTestId("saved-empty").waitFor();
  },
});

const startCareerAndSave = async (page: Page) => {
  await page.goto(`${APP}#/new`);
  await page.getByTestId("choose-club").click();
  await page.getByTestId("club-name").first().click();
  await page.getByTestId("start-career").click();
  await page.getByTestId("quick-sim").click();
  await page.getByTestId("results-continue").click();
  // By hash: the Saves link sits in the More sheet on a phone.
  await page.evaluate(() => {
    window.location.hash = "#/saves";
  });
  await page.getByTestId("save-slot-1").click();
  // Language-neutral: a filled slot offers Load.
  await page.getByTestId("load-slot-1").waitFor();
};

visualScreen({
  name: "start-continue-and-saved",
  route: "#/",
  state: async (page) => {
    await startCareerAndSave(page);
    await page.goto(`${APP}#/`);
    await page.reload();
    await page.getByTestId("continue-career").waitFor();
    await page.getByTestId("load-toggle").click();
    await page.getByTestId("saved-slot-1").waitFor();
  },
});

visualScreen({
  name: "start-corrupt-autosave",
  route: "#/",
  state: async (page) => {
    await page.getByTestId("saved-empty").waitFor();
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open("touchline", 1);
          open.onupgradeneeded = () => open.result.createObjectStore("saves");
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const tx = open.result.transaction("saves", "readwrite");
            tx.objectStore("saves").put(
              { schemaVersion: 2, createdAt: "x", savedAt: "x", game: { broken: true } },
              "autosave",
            );
            tx.oncomplete = () => {
              open.result.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.reload();
    await page.getByTestId("load-error").waitFor();
  },
});

// The app shell around the career hub (#254): sidebar, icon rail and bottom tabs by width.
visualScreen({
  name: "app-shell-hub",
  full: true,
  route: "#/new",
  state: async (page) => {
    await page.getByTestId("choose-club").click();
    await page.getByTestId("club-name").first().click();
    await page.getByTestId("start-career").click();
    await page.getByTestId("career-hub").waitFor();
  },
});

// The home dashboard (#259): first matchday (empty table) and after four quick-simmed matchdays.
const startCareerAtHub = async (page: Page) => {
  await page.getByTestId("choose-club").click();
  await page.getByTestId("club-name").first().click();
  await page.getByTestId("start-career").click();
  await page.getByTestId("career-hub").waitFor();
};

visualScreen({ name: "hub-first-matchday", route: "#/new", state: startCareerAtHub });

visualScreen({
  name: "hub-mid-season",
  full: true,
  route: "#/new",
  state: async (page) => {
    await startCareerAtHub(page);
    for (let i = 0; i < 4; i++) {
      await page.getByTestId("quick-sim").click();
      await page.getByTestId("results-continue").click();
      await page.getByTestId("career-hub").waitFor();
    }
  },
});

// The command palette (#255) open over the hub, with a query that matches clubs and players.
visualScreen({
  name: "command-palette",
  route: "#/new",
  state: async (page) => {
    await page.getByTestId("choose-club").click();
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
