import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryDensityStore,
  createMemoryLocaleStore,
  createMemoryThemeStore,
} from "../../platform";
import type { DensityStore, LocaleStore, ThemeStore } from "../../shared";
import { I18nProvider } from "../i18n-provider";
import { DensityProvider } from "../theme/density-provider";
import { ThemeProvider } from "../theme/theme-provider";
import { SettingsScreen } from "./settings-screen";

type Stores = { locale: LocaleStore; theme: ThemeStore; density: DensityStore };

const mount = (
  stores: Partial<Stores> = {},
  props: { preferencesPersist?: boolean; locale?: string } = {},
) => {
  const all: Stores = {
    locale: stores.locale ?? createMemoryLocaleStore(props.locale),
    theme: stores.theme ?? createMemoryThemeStore(),
    density: stores.density ?? createMemoryDensityStore(),
  };
  render(
    <I18nProvider store={all.locale}>
      <ThemeProvider store={all.theme}>
        <DensityProvider store={all.density}>
          <SettingsScreen preferencesPersist={props.preferencesPersist ?? true} />
        </DensityProvider>
      </ThemeProvider>
    </I18nProvider>,
  );
  return all;
};

const stubReducedMotion = (reduced: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

describe("settings screen", () => {
  beforeEach(() => stubReducedMotion(false));
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.theme;
  });

  it("has a page heading", () => {
    mount();
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeTruthy();
  });

  it("switches the language at once and remembers it", () => {
    const { locale } = mount();
    fireEvent.click(screen.getByRole("radio", { name: "Swedish" }));
    expect(screen.getByRole("heading", { level: 1, name: "Inställningar" })).toBeTruthy();
    expect(locale.load()).toBe("sv");
  });

  it("shows the active language as selected", () => {
    mount({}, { locale: "sv" });
    const group = screen.getByRole("radiogroup", { name: "Språk" });
    expect(within(group).getByRole("radio", { name: "Svenska" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("offers the three themes as a radio group with Midnight selected by default", () => {
    mount();
    const group = screen.getByRole("radiogroup", { name: "Theme" });
    const names = within(group)
      .getAllByRole("radio")
      .map((radio) => (radio as HTMLInputElement).value);
    expect(names).toEqual(["midnight", "graphite", "light"]);
    expect(
      (within(group).getByRole("radio", { name: "Midnight" }) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("applies a chosen theme to the page at once and remembers it", () => {
    const { theme } = mount();
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(theme.load()).toBe("light");
  });

  it("starts with the remembered theme selected", () => {
    mount({ theme: createMemoryThemeStore("graphite") });
    expect((screen.getByRole("radio", { name: "Graphite" }) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("previews each theme with its own tokens", () => {
    mount();
    for (const name of ["midnight", "graphite", "light"]) {
      expect(document.querySelector(`[data-theme-preview="${name}"]`)).not.toBeNull();
    }
  });

  it("offers compact density by default and changes it at once", () => {
    const { density } = mount();
    const group = screen.getByRole("radiogroup", { name: "Table density" });
    expect(within(group).getByRole("radio", { name: "Compact" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    fireEvent.click(within(group).getByRole("radio", { name: "Comfortable" }));
    expect(density.load()).toBe("comfortable");
    expect(
      within(group).getByRole("radio", { name: "Comfortable" }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("names the choices in Swedish", () => {
    mount({}, { locale: "sv" });
    expect(screen.getByRole("radio", { name: "Midnatt" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Luftig" })).toBeTruthy();
  });

  it("shows a motion note only when the system asks for reduced motion", () => {
    mount();
    expect(screen.queryByTestId("settings-motion-note")).toBeNull();
    cleanup();
    stubReducedMotion(true);
    mount();
    expect(screen.getByTestId("settings-motion-note").textContent).toMatch(/reduced motion/i);
  });

  it("explains that choices only last for the session when storage is blocked", () => {
    mount({}, { preferencesPersist: false });
    expect(screen.getByTestId("settings-storage-notice").textContent).toMatch(/until you close/i);
  });

  it("has no storage notice when choices can be remembered", () => {
    mount();
    expect(screen.queryByTestId("settings-storage-notice")).toBeNull();
  });

  it("still applies a choice when the store cannot persist anything", () => {
    mount({ theme: { load: () => null, save: () => {} } }, { preferencesPersist: false });
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  describe("table density preview", () => {
    const previewDensity = () =>
      screen.getAllByTestId("density-preview")[0]?.getAttribute("data-density");

    it("previews the selected density", () => {
      mount();
      expect(previewDensity()).toBe("compact");
    });

    it("previews an option on hover without choosing it, and goes back on leave", () => {
      const { density } = mount();
      const comfortable = screen.getByRole("radio", { name: "Comfortable" });
      fireEvent.mouseEnter(comfortable);
      expect(previewDensity()).toBe("comfortable");
      expect(density.load()).not.toBe("comfortable");
      fireEvent.mouseLeave(comfortable);
      expect(previewDensity()).toBe("compact");
    });

    it("previews an option on focus", () => {
      mount();
      const comfortable = screen.getByRole("radio", { name: "Comfortable" });
      fireEvent.focus(comfortable);
      expect(previewDensity()).toBe("comfortable");
      fireEvent.blur(comfortable);
      expect(previewDensity()).toBe("compact");
    });

    it("commits the choice on click", () => {
      const { density } = mount();
      fireEvent.click(screen.getByRole("radio", { name: "Comfortable" }));
      expect(density.load()).toBe("comfortable");
      expect(previewDensity()).toBe("comfortable");
    });

    it("shows a tiny preview per option and marks the selected one", () => {
      mount();
      expect(screen.getByTestId("density-option-compact").className).toContain("border-accent");
      expect(screen.getByTestId("density-option-comfortable").className).not.toContain(
        "border-accent",
      );
    });

    it("keeps the previews out of the accessibility tree", () => {
      mount();
      const group = screen.getByRole("radiogroup", { name: "Table density" });
      expect(within(group).getAllByRole("radio")).toHaveLength(2);
      expect(screen.queryAllByRole("table")).toHaveLength(0);
    });
  });
});
