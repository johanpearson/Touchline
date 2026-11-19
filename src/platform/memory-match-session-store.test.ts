import { runMatchSessionStoreContract } from "./match-session-store-contract";
import { createMemoryMatchSessionStore } from "./memory-match-session-store";

runMatchSessionStoreContract("memory match session store", (raw) =>
  createMemoryMatchSessionStore(raw ?? null),
);
