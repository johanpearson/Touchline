/**
 * Shared look of text inputs and the select trigger. Targets are at least 44 px high (`min-h-11`),
 * the focus ring comes from the focus token, and an invalid control gets a `bad` border (the error
 * text next to it carries the meaning, never the colour alone).
 */
export const fieldControlStyles = [
  "min-h-11 w-full rounded-md border bg-raised px-3 text-[15px] text-text",
  "placeholder:text-muted transition-colors duration-150",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-[invalid=true]:border-bad border-line",
].join(" ");
