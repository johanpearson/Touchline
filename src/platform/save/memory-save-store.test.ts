import { createMemorySaveStore } from "./memory-save-store";
import { runSaveStoreContract } from "./save-store-contract";

runSaveStoreContract("memory save store", createMemorySaveStore);
