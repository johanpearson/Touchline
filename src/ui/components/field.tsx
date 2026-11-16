import { type ReactNode, useId } from "react";
import { cn } from "./cn";

/** What a control inside a `Field` must spread on itself so label, hint and error stay linked. */
export type FieldControlProps = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
};

export type FieldProps = {
  /** Visible label (translated by the caller); it names the control for assistive technology. */
  label: string;
  hint?: string;
  error?: string;
  /** Overrides the generated id of the control. */
  id?: string;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

/** Label, control, hint and error as one unit. The error and hint are linked with `aria-describedby`. */
export function Field({ label, hint, error, id, className, children }: FieldProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={controlId} className="text-[13px] font-semibold text-soft">
        {label}
      </label>
      {children({
        id: controlId,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint ? (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-[13px] font-semibold text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
