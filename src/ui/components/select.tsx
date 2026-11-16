import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./cn";
import { Field } from "./field";
import { fieldControlStyles } from "./field-styles";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = {
  label: string;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
};

/**
 * A labelled select on Radix Select: arrow keys, Home, End and type-ahead work inside the list.
 * A long (Swedish) option label is cut with an ellipsis and keeps the full text as `title`.
 */
export function Select({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  hint,
  error,
  disabled,
  name,
  id,
  className,
}: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      {(control) => (
        <RadixSelect.Root
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          disabled={disabled}
          name={name}
        >
          <RadixSelect.Trigger
            {...control}
            className={cn(
              fieldControlStyles,
              "inline-flex cursor-pointer items-center justify-between gap-2 text-left",
              "data-[placeholder]:text-muted",
            )}
          >
            <span className="min-w-0 flex-1 truncate">
              <RadixSelect.Value placeholder={placeholder} />
            </span>
            <RadixSelect.Icon aria-hidden="true">
              <ChevronDown className="size-4 text-muted" />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>
          <RadixSelect.Portal>
            <RadixSelect.Content
              position="popper"
              sideOffset={4}
              className="z-50 max-h-[min(20rem,var(--radix-select-content-available-height))] w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-line bg-raised text-text shadow-lg"
            >
              <RadixSelect.Viewport className="p-1">
                {options.map((option) => (
                  <RadixSelect.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    title={option.label}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-3 text-[15px] select-none",
                      "data-[highlighted]:bg-glow data-[highlighted]:outline-none",
                      "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
                    )}
                  >
                    <RadixSelect.ItemText>
                      <span className="block truncate">{option.label}</span>
                    </RadixSelect.ItemText>
                    <RadixSelect.ItemIndicator className="ml-auto" aria-hidden="true">
                      <Check className="size-4 text-accent" />
                    </RadixSelect.ItemIndicator>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
      )}
    </Field>
  );
}
