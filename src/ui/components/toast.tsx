import * as RadixToast from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "./cn";
import { IconButton } from "./icon-button";

export type ToastTone = "success" | "error" | "info";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastItem = ToastInput & { id: number };

const SUCCESS_MS = 5000;

const toneEdge: Record<ToastTone, string> = {
  success: "border-l-good",
  error: "border-l-bad",
  info: "border-l-info",
};

type ToastApi = { toast: (input: ToastInput) => void };

const ToastContext = createContext<ToastApi | null>(null);

/** Shows toasts. Error toasts stay until dismissed; others close themselves. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside ToastProvider");
  return api;
}

export type ToastProviderProps = {
  children: ReactNode;
  /** Translated accessible name of each toast's dismiss button. */
  dismissLabel: string;
  /** Translated name of the notification region, for example "Notifications (F8)". */
  viewportLabel: string;
};

function ToastView(props: {
  item: ToastItem;
  dismissLabel: string;
  onClose: (id: number) => void;
}) {
  const { item } = props;
  const tone = item.tone ?? "info";
  return (
    <RadixToast.Root
      type="background"
      duration={tone === "error" ? Number.POSITIVE_INFINITY : SUCCESS_MS}
      onOpenChange={(open) => {
        if (!open) props.onClose(item.id);
      }}
      data-tone={tone}
      className={cn(
        "flex items-start gap-3 rounded-lg border border-l-4 border-line bg-raised p-4 text-text shadow-lg",
        toneEdge[tone],
      )}
    >
      <div className="min-w-0 flex-1">
        <RadixToast.Title className="font-semibold">{item.title}</RadixToast.Title>
        {item.description ? (
          <RadixToast.Description className="mt-1 text-[13px] text-soft">
            {item.description}
          </RadixToast.Description>
        ) : null}
      </div>
      <RadixToast.Close asChild>
        <IconButton label={props.dismissLabel} size="sm" icon={<X className="size-4" />} />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}

export function ToastProvider({ children, dismissLabel, viewportLabel }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((input: ToastInput) => {
    setItems((current) => [...current, { ...input, id: nextId() }]);
  }, []);
  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  const api = useMemo(() => ({ toast }), [toast]);
  return (
    <ToastContext.Provider value={api}>
      <RadixToast.Provider label={viewportLabel} swipeDirection="right">
        {children}
        {items.map((item) => (
          <ToastView key={item.id} item={item} dismissLabel={dismissLabel} onClose={remove} />
        ))}
        <RadixToast.Viewport className="fixed right-4 bottom-4 z-60 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-3 outline-none max-sm:bottom-20" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

let counter = 0;
const nextId = () => {
  counter += 1;
  return counter;
};
