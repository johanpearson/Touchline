import type { FileTransfer, PickedFile } from "../shared";

export function createBrowserFileTransfer(): FileTransfer {
  return {
    download(name, text) {
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.hidden = true;
      document.body.append(anchor);
      try {
        anchor.click();
      } finally {
        anchor.remove();
        URL.revokeObjectURL(url);
      }
    },
    pickFile() {
      return new Promise<PickedFile | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";
        input.hidden = true;
        const finish = (result: Promise<PickedFile | null> | null) => {
          input.remove();
          resolve(result);
        };
        input.addEventListener("cancel", () => finish(null));
        input.addEventListener("change", () => {
          const file = input.files?.[0];
          finish(file ? file.text().then((text) => ({ name: file.name, text })) : null);
        });
        document.body.append(input);
        input.click();
      });
    },
  };
}

export type MemoryFileTransfer = FileTransfer & {
  downloads: PickedFile[];
  queueFile: (file: PickedFile) => void;
};

export function createMemoryFileTransfer(): MemoryFileTransfer {
  const downloads: PickedFile[] = [];
  const queue: PickedFile[] = [];
  return {
    downloads,
    queueFile: (file) => {
      queue.push(file);
    },
    download: (name, text) => {
      downloads.push({ name, text });
    },
    pickFile: () => Promise.resolve(queue.shift() ?? null),
  };
}
