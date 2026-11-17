import {
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import type { ThemeStore } from "../../shared";
import { DEFAULT_THEME, isTheme, type Theme } from "./themes";

type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = { store: ThemeStore; children: ReactNode };

/** Keeps the theme in state, applies it as `data-theme` on `<html>` and remembers it. */
export function ThemeProvider({ store, children }: Props) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = store.load();
    return isTheme(saved) ? saved : DEFAULT_THEME;
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: (next) => {
        store.save(next);
        setThemeState(next);
      },
    }),
    [theme, store],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
