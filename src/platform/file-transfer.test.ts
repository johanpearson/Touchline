import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrowserFileTransfer, createMemoryFileTransfer } from "./file-transfer";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("createBrowserFileTransfer", () => {
  it("downloads through an anchor click and revokes the object URL afterwards", () => {
    const create = vi.fn(() => "blob:test");
    const revoke = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe("save.json");
      expect(this.href).toBe("blob:test");
    });

    createBrowserFileTransfer().download("save.json", "{}");

    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:test");
    expect(document.querySelector("a")).toBeNull();
  });

  it("resolves with the picked file name and text", async () => {
    const promise = createBrowserFileTransfer().pickFile();
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    expect(input.accept).toBe("application/json,.json");
    const file = new File(["{}"], "a.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change"));
    expect(await promise).toEqual({ name: "a.json", text: "{}" });
    expect(document.querySelector("input")).toBeNull();
  });

  it("resolves null when the picker is cancelled", async () => {
    const promise = createBrowserFileTransfer().pickFile();
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    input.dispatchEvent(new Event("cancel"));
    expect(await promise).toBeNull();
    expect(document.querySelector("input")).toBeNull();
  });

  it("resolves null when no file is chosen", async () => {
    const promise = createBrowserFileTransfer().pickFile();
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    input.dispatchEvent(new Event("change"));
    expect(await promise).toBeNull();
  });
});

describe("createMemoryFileTransfer", () => {
  it("records downloads", () => {
    const transfer = createMemoryFileTransfer();
    transfer.download("a.json", "x");
    expect(transfer.downloads).toEqual([{ name: "a.json", text: "x" }]);
  });

  it("returns queued files in order, then null", async () => {
    const transfer = createMemoryFileTransfer();
    transfer.queueFile({ name: "a.json", text: "1" });
    expect(await transfer.pickFile()).toEqual({ name: "a.json", text: "1" });
    expect(await transfer.pickFile()).toBeNull();
  });
});
