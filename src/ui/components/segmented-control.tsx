import { type KeyboardEvent, useRef } from "react";
import { cn } from "./cn";
import { targetIndex } from "./segmented-keys";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export type SegmentedControlProps<T extends string> = {
  /** Names the group for assistive technology (for example "Speed"). */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
};

/**
 * A single-choice control (view, speed, density) with radio-group semantics: one tab stop, arrow
 * keys move and select, Home and End jump to the first and last enabled option.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.findIndex((o) => o.value === value);
  const tabStop =
    selected >= 0 && !options[selected]?.disabled
      ? selected
      : options.findIndex((o) => !o.disabled);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const target = targetIndex(
      event.key,
      index,
      options.map((o) => !o.disabled),
    );
    const next = options[target];
    if (!next) return;
    event.preventDefault();
    onValueChange(next.value);
    refs.current[target]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex gap-1 rounded-md border border-line bg-sunk p-1", className)}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a styled button as radio keeps the segment look; arrow keys are implemented here
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={option.disabled}
            tabIndex={index === tabStop ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "min-h-9 min-w-11 cursor-pointer rounded-sm border-0 px-3 text-[13px] font-semibold select-none pointer-coarse:min-h-11",
              "transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              "disabled:cursor-not-allowed disabled:opacity-50",
              checked
                ? "bg-accent text-on-accent"
                : "bg-transparent text-soft hover:bg-raised hover:text-text",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
