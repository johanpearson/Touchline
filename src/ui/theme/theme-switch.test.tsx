import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryLocaleStore, createMemoryThemeStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import { ThemeProvider } from "./theme-provider";
import { ThemeSwitch } from "./theme-switch";

const wrap = (children: ReactNode, themeStore = createMemoryThemeStore(), locale = "en") => (
  <I18nProvider store={createMemoryLocaleStore(locale)}>
    <ThemeProvider store={themeStore}>{children}</ThemeProvider>
  </I18nProvider>
);

const themeOnHtml = () => document.documentElement.dataset.theme;

describe("ThemeSwitch", () => {
  afterEach(() => {
    cleanup();
    delete document.documentElement.dataset.theme;
  });

  it("applies Midnight by default", () => {
    render(wrap(<ThemeSwitch />));
    expect(themeOnHtml()).toBe("midnight");
    expect((screen.getByTestId("theme-switch") as HTMLSelectElement).value).toBe("midnight");
  });

  it("changes data-theme on <html> and remembers the choice", () => {
    const store = createMemoryThemeStore();
    render(wrap(<ThemeSwitch />, store));
    fireEvent.change(screen.getByTestId("theme-switch"), { target: { value: "light" } });
    expect(themeOnHtml()).toBe("light");
    expect(store.load()).toBe("light");
  });

  it("starts in the saved theme, as after a reload", () => {
    render(wrap(<ThemeSwitch />, createMemoryThemeStore("graphite")));
    expect(themeOnHtml()).toBe("graphite");
  });

  it("falls back to Midnight for an unknown saved value", () => {
    render(wrap(<ThemeSwitch />, createMemoryThemeStore("neon")));
    expect(themeOnHtml()).toBe("midnight");
  });

  it("works with a store that cannot persist anything", () => {
    const failing = { load: () => null, save: () => {} };
    render(wrap(<ThemeSwitch />, failing));
    fireEvent.change(screen.getByTestId("theme-switch"), { target: { value: "light" } });
    expect(themeOnHtml()).toBe("light");
  });

  it("has an accessible name in English and Swedish", () => {
    render(wrap(<ThemeSwitch />));
    expect(screen.getByLabelText("Theme")).toBe(screen.getByTestId("theme-switch"));
    cleanup();
    render(wrap(<ThemeSwitch />, createMemoryThemeStore(), "sv"));
    expect(screen.getByLabelText("Tema")).toBe(screen.getByTestId("theme-switch"));
  });

  it("names every theme in both languages", () => {
    render(wrap(<ThemeSwitch />, createMemoryThemeStore(), "sv"));
    const names = [...screen.getByTestId("theme-switch").querySelectorAll("option")].map(
      (o) => o.textContent,
    );
    expect(names).toEqual(["Midnatt", "Grafit", "Ljust"]);
  });
});
