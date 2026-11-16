import { Search } from "lucide-react";
import type { InputHTMLAttributes, Ref } from "react";
import { cn } from "./cn";
import { Field } from "./field";
import { fieldControlStyles } from "./field-styles";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "aria-describedby"> & {
  ref?: Ref<HTMLInputElement>;
  label: string;
  hint?: string;
  error?: string;
  /** `search` adds a magnifier and uses `type="search"` (role `searchbox`). */
  variant?: "default" | "search";
};

/** A labelled text input with optional hint and error; the error is linked with `aria-describedby`. */
export function Input({
  label,
  hint,
  error,
  variant = "default",
  id,
  className,
  type,
  ref,
  ...rest
}: InputProps) {
  const search = variant === "search";
  return (
    <Field label={label} hint={hint} error={error} id={id} className={className}>
      {(control) => (
        <div className="relative">
          {search ? (
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            />
          ) : null}
          <input
            {...rest}
            {...control}
            ref={ref}
            type={search ? "search" : (type ?? "text")}
            className={cn(
              fieldControlStyles,
              search && "pl-9 [&::-webkit-search-cancel-button]:appearance-none",
            )}
          />
        </div>
      )}
    </Field>
  );
}
