import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserDensityStore,
  createBrowserFileTransfer,
  createBrowserLocaleStore,
  createBrowserMatchSessionStore,
  createBrowserThemeStore,
  createIndexedDbSaveStore,
  createMemorySaveStore,
  isIndexedDbAvailable,
} from "./platform";
import { App } from "./ui";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root not found");
}
const root = createRoot(container);

async function start() {
  const storageAvailable = await isIndexedDbAvailable();
  root.render(
    <StrictMode>
      <App
        localeStore={createBrowserLocaleStore()}
        themeStore={createBrowserThemeStore()}
        densityStore={createBrowserDensityStore()}
        matchSessionStore={createBrowserMatchSessionStore()}
        saveStore={storageAvailable ? createIndexedDbSaveStore() : createMemorySaveStore()}
        fileTransfer={createBrowserFileTransfer()}
        storageAvailable={storageAvailable}
        now={() => new Date().toISOString()}
        initialSeed={Math.floor(Math.random() * 2 ** 31)}
      />
    </StrictMode>,
  );
}

void start();
