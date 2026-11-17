import { expect, type Page, test } from "@playwright/test";
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

// Writes a damaged envelope straight into IndexedDB, as a half-finished write would leave it.
const putCorruptSave = (page: Page, slotId: string) =>
  page.evaluate(
    (id) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("touchline", 1);
        open.onupgradeneeded = () => open.result.createObjectStore("saves");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction("saves", "readwrite");
          tx.objectStore("saves").put(
            { schemaVersion: 2, createdAt: "x", savedAt: "x", game: { broken: true } },
            id,
          );
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    slotId,
  );

visualScreen({
  name: "start-corrupt-autosave",
  route: "#/",
  state: async (page) => {
    await page.getByTestId("saved-empty").waitFor();
    await putCorruptSave(page, "autosave");
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

// The squad table (#260): default, filtered to defenders, no search result, and comfortable density.
const openSquadTable = async (page: Page) => {
  await startCareerAtHub(page);
  // By hash: the Squad link sits in the tab bar or the rail depending on width.
  await page.evaluate(() => {
    window.location.hash = "#/squad";
  });
  await page.getByTestId("squad-screen").waitFor();
  await page.getByTestId("squad-table").waitFor();
};

visualScreen({ name: "squad-default", route: "#/new", state: openSquadTable });

visualScreen({
  name: "squad-filtered",
  route: "#/new",
  state: async (page) => {
    await openSquadTable(page);
    await page.getByTestId("squad-filter-DEF").click();
    await page.getByTestId("squad-table").waitFor();
  },
});

visualScreen({
  name: "squad-no-results",
  route: "#/new",
  state: async (page) => {
    await openSquadTable(page);
    await page.getByTestId("squad-search").fill("zzzzqq");
    await page.getByTestId("squad-empty").waitFor();
  },
});

visualScreen({
  name: "squad-comfortable",
  route: "#/new",
  state: async (page) => {
    // The density option has no settings screen yet (#270), so set what the store reads.
    await page.evaluate(() => window.localStorage.setItem("touchline.density", "comfortable"));
    await page.reload();
    await openSquadTable(page);
  },
});

// The player profile (#261): an outfield player and a goalkeeper, opened from the squad table.
const openPlayerFrom = (position: "FWD" | "GK") => async (page: Page) => {
  await openSquadTable(page);
  await page.getByTestId(`squad-filter-${position}`).click();
  await page.getByTestId("squad-table").waitFor();
  await page.locator('[data-testid^="player-link-"]').first().click();
  await page.getByTestId("player-screen").waitFor();
};

visualScreen({
  name: "player-outfield",
  full: true,
  route: "#/new",
  state: openPlayerFrom("FWD"),
});

visualScreen({
  name: "player-goalkeeper",
  full: true,
  route: "#/new",
  state: openPlayerFrom("GK"),
});

// The tactics and lineup screen (#262): 4-4-2 on the pitch, 3-5-2, and the player picker open.
// The pitch is shown on every width (phones default to the list), so the stage is in the snapshot.
const openTacticsPitch = async (page: Page) => {
  await startCareerAtHub(page);
  // By hash: the Tactics link sits in the rail, the sidebar or the More sheet depending on width.
  await page.evaluate(() => {
    window.location.hash = "#/tactics";
  });
  await page.getByTestId("tactics-screen").waitFor();
  await page.getByTestId("lineup-view").getByRole("radio").first().click();
  await page.getByTestId("lineup-pitch").waitFor();
};

visualScreen({ name: "tactics-442", full: true, route: "#/new", state: openTacticsPitch });

visualScreen({
  name: "tactics-352",
  full: true,
  route: "#/new",
  state: async (page) => {
    await openTacticsPitch(page);
    await page.getByTestId("formation").getByRole("radio", { name: "3-5-2", exact: true }).click();
    await page.getByTestId("pitch-slot-10").waitFor();
  },
});

visualScreen({
  name: "tactics-picker",
  full: true,
  route: "#/new",
  state: async (page) => {
    await openTacticsPitch(page);
    await page.getByTestId("pitch-slot-1").click();
    await page.getByTestId("player-picker").waitFor();
  },
});

// The league screen (#263): table at the start of the season, mid season and after 25 matchdays
// (the last round is the current one), and the fixtures of those rounds.
const playMatchdays = async (page: Page, count: number) => {
  for (let i = 0; i < count; i++) {
    await page.getByTestId("quick-sim").click();
    await page.getByTestId("results-continue").click();
    await page.getByTestId("career-hub").waitFor();
  }
};

const openLeague = async (page: Page, tab: "table" | "fixtures") => {
  await page.evaluate(() => {
    window.location.hash = "#/league";
  });
  await page.getByTestId("screen-league").waitFor();
  await page.getByTestId(`tab-${tab}`).click();
  await page.getByTestId(tab === "table" ? "league-table" : "fixtures-view").waitFor();
};

const leagueAfter = (matchdays: number, tab: "table" | "fixtures") => async (page: Page) => {
  await startCareerAtHub(page);
  await playMatchdays(page, matchdays);
  await openLeague(page, tab);
};

visualScreen({
  name: "league-start-of-season",
  full: true,
  route: "#/new",
  state: leagueAfter(0, "table"),
});
visualScreen({
  name: "league-mid-season",
  full: true,
  route: "#/new",
  state: leagueAfter(12, "table"),
});
visualScreen({
  name: "league-last-round",
  full: true,
  route: "#/new",
  state: leagueAfter(25, "table"),
});
visualScreen({
  name: "league-fixtures-start",
  route: "#/new",
  state: leagueAfter(0, "fixtures"),
});
visualScreen({
  name: "league-fixtures-last-round",
  route: "#/new",
  state: leagueAfter(25, "fixtures"),
});

// Closes the "Saved" toasts so the snapshot does not depend on how long they stay. Always the first one, and
// until the count has dropped: `locator.all()` would give positions (`.nth(1)`) that vanish when the first closes.
const closeToasts = async (page: Page) => {
  const toasts = page.locator("[data-tone]");
  for (let open = await toasts.count(); open > 0; open = await toasts.count()) {
    await toasts.first().locator("button").click();
    await expect(toasts).toHaveCount(open - 1);
  }
};

// The saves screen (#270): autosave, two used manual slots and one damaged slot.
visualScreen({
  name: "saves-slots-and-corrupt",
  full: true,
  route: "#/new",
  state: async (page) => {
    await startCareerAtHub(page);
    await putCorruptSave(page, "slot-3");
    // By hash: the Saves link sits in the More sheet on a phone.
    await page.evaluate(() => {
      window.location.hash = "#/saves";
    });
    await page.getByTestId("save-slot-1").click();
    await page.getByTestId("load-slot-1").waitFor();
    await page.getByTestId("save-slot-2").click();
    await page.getByTestId("load-slot-2").waitFor();
    await page.getByTestId("delete-slot-3").waitFor();
    await closeToasts(page);
  },
});

// The settings screen (#270): the theme cards show all three themes in each theme.
visualScreen({
  name: "settings-default",
  full: true,
  route: "#/new",
  state: async (page) => {
    await startCareerAtHub(page);
    await page.evaluate(() => {
      window.location.hash = "#/settings";
    });
    await page.getByTestId("settings-screen").waitFor();
  },
});

// The club screen (#264): another club (from the league table) and the user's own (from a player's
// profile). The light-coloured club is a story (club-screen.stories.tsx): generated clubs are not light.
visualScreen({
  name: "club-other",
  full: true,
  route: "#/new",
  state: async (page) => {
    await startCareerAtHub(page);
    await page.evaluate(() => {
      window.location.hash = "#/league";
    });
    await page.getByTestId("league-table").waitFor();
    const links = page.locator('[data-testid="league-table"] a[href^="#/club/"]');
    await links.last().evaluate((a) => (a as HTMLAnchorElement).click());
    await page.getByTestId("club-screen").waitFor();
    await page.getByTestId("squad-table").waitFor();
  },
});

visualScreen({
  name: "club-mine",
  full: true,
  route: "#/new",
  state: async (page) => {
    await startCareerAtHub(page);
    await page.evaluate(() => {
      window.location.hash = "#/squad";
    });
    await page.getByTestId("squad-table").waitFor();
    await page.locator('[data-testid^="player-link-"]').first().click();
    await page.getByTestId("player-club").click();
    await page.getByTestId("club-screen").waitFor();
    await page.getByTestId("your-club").waitFor();
  },
});

// The match screen (#267), with the terrain (WebGL) masked: kick-off paused, a goal just scored,
// and full time with the ratings. Playback runs on the real clock, so the first two pause as soon
// as the state is reached; the clash-kit pairing is covered by unit tests (the generated league
// has no clashing pair to pick).
const TERRAIN = ["[data-testid='momentum-terrain']"];

const openMatch = async (page: Page) => {
  await startCareerAtHub(page);
  await page.getByTestId("play-match").click();
  await page.getByTestId("match-screen").waitFor();
};

visualScreen({
  name: "match-kickoff",
  full: true,
  route: "#/new",
  mask: TERRAIN,
  state: async (page) => {
    await openMatch(page);
    await page.getByTestId("pause-toggle").click();
  },
});

visualScreen({
  name: "match-goal",
  route: "#/new",
  mask: TERRAIN,
  state: async (page) => {
    await openMatch(page);
    test.setTimeout(120_000);
    await page.getByTestId("speed-4").click();
    // A goal in the first half, or half-time when there was none: both are settled states.
    await page.waitForFunction(
      () =>
        document.querySelector("[data-testid='scoreboard']")?.getAttribute("data-goal") ||
        document.querySelector("[data-testid='half-time']"),
      undefined,
      { timeout: 60_000 },
    );
    await page.getByTestId("pause-toggle").click();
  },
});

visualScreen({
  name: "match-full-time",
  route: "#/new",
  mask: TERRAIN,
  state: async (page) => {
    test.setTimeout(180_000);
    await openMatch(page);
    await page.getByTestId("speed-4").click();
    // Half-time stops the match; the second half starts from its panel.
    await page.getByTestId("start-second-half").click({ timeout: 60_000 });
    await page.getByTestId("player-ratings").waitFor({ timeout: 60_000 });
  },
});

visualScreen({
  name: "match-2d-pitch",
  route: "#/new",
  mask: ["[data-testid='classic-pitch']"],
  state: async (page) => {
    await openMatch(page);
    await page.getByTestId("view-pitch").click();
    await page.getByTestId("pause-toggle").click();
  },
});
