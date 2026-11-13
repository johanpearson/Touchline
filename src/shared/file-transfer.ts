/** A file picked by the user. */
export type PickedFile = { name: string; text: string };

/** Moves text files in and out of the app. Implemented by platform adapters. */
export type FileTransfer = {
  /** Hands `text` to the user as a downloaded file called `name`. */
  download: (name: string, text: string) => void;
  /** Lets the user pick a file. Resolves to `null` when they cancel. */
  pickFile: () => Promise<PickedFile | null>;
};
