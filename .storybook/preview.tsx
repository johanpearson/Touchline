import type { Decorator, Preview } from "@storybook/react-vite";
import { useLayoutEffect } from "react";
import { createMemoryLocaleStore } from "../src/platform";
import { I18nProvider } from "../src/ui/i18n-provider";
import { THEMES } from "../src/ui/theme/themes";
import "../src/ui/theme/theme.css";

const LOCALES = ["en", "sv"] as const;

const withThemeAndLocale: Decorator = (Story, context) => {
  const theme = String(context.globals.theme ?? "midnight");
  const locale = String(context.globals.locale ?? "en");
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <I18nProvider key={locale} store={createMemoryLocaleStore(locale)}>
      <div className="min-h-24 bg-bg p-6 text-text">
        <Story />
      </div>
    </I18nProvider>
  );
};

const preview: Preview = {
  decorators: [withThemeAndLocale],
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: { title: "Theme", icon: "paintbrush", items: [...THEMES], dynamicTitle: true },
    },
    locale: {
      description: "Language",
      toolbar: { title: "Language", icon: "globe", items: [...LOCALES], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "midnight", locale: "en" },
  parameters: { layout: "fullscreen", controls: { expanded: true } },
};

export default preview;
