import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  /** A decorative icon; it is hidden from assistive technology. */
  icon?: ReactNode;
  title: string;
  text?: string;
  /** Usually a Button. */
  action?: ReactNode;
};

export function EmptyState({ icon, title, text, action, className, ...rest }: EmptyStateProps) {
  return (
    <div
      {...rest}
      className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}
    >
      {icon ? (
        <span aria-hidden="true" className="text-muted">
          {icon}
        </span>
      ) : null}
      <h3 className="m-0 font-heading text-2xl text-text">{title}</h3>
      {text ? <p className="m-0 max-w-prose text-muted">{text}</p> : null}
      {action}
    </div>
  );
}
