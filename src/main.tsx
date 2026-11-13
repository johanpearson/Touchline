import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserLocaleStore } from "./platform";
import { App } from "./ui";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}

createRoot(container).render(
  <StrictMode>
    <App
      localeStore={createBrowserLocaleStore()}
      initialSeed={Math.floor(Math.random() * 2 ** 31)}
    />
  </StrictMode>,
);
