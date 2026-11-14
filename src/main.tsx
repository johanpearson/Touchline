import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserLocaleStore,
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
        saveStore={storageAvailable ? createIndexedDbSaveStore() : createMemorySaveStore()}
        storageAvailable={storageAvailable}
        now={() => new Date().toISOString()}
        initialSeed={Math.floor(Math.random() * 2 ** 31)}
      />
    </StrictMode>,
  );
}

void start();
