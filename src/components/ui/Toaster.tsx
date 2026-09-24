// The toast region (F1). Lives in the top layer so toasts stay visible above open dialogs.
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useToastStore, type ToastItem } from "@/stores/toastStore";
import { cx } from "./cx";
import { POPOVER_MANUAL, showInTopLayer } from "./topLayer";

function ToastView({ toast }: { toast: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const started = useRef(0);

  useEffect(() => {
    if (paused) return;
    started.current = Date.now();
    const timer = setTimeout(() => dismiss(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started.current;
    };
  }, [paused, dismiss, toast.id]);

  const Icon = toast.tone === "success" ? CircleCheck : toast.tone === "error" ? CircleAlert : null;
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="atlas-toast pointer-events-auto flex w-full items-center gap-3 rounded-panel border border-rule bg-surface-raised py-2 pr-2 pl-4 text-base text-text shadow-float"
    >
      {Icon && (
        <Icon
          size={18}
          aria-hidden="true"
          className={cx("shrink-0", toast.tone === "success" ? "text-success" : "text-danger")}
        />
      )}
      <p className="min-w-0 flex-1 py-1">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            dismiss(toast.id);
          }}
          className="h-8 shrink-0 rounded-control px-2.5 text-base font-medium text-accent hover:bg-accent-soft max-md:h-10"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="grid size-8 shrink-0 place-items-center rounded-control text-muted hover:bg-surface-sunken hover:text-text max-md:size-10"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const ref = useRef<HTMLDivElement>(null);

  // Re-show on every change so the region sits above any dialog opened since.
  useLayoutEffect(() => {
    if (toasts.length > 0) showInTopLayer(ref.current);
  }, [toasts]);

  return (
    <div
      ref={ref}
      popover={POPOVER_MANUAL}
      aria-live="polite"
      className="pointer-events-none fixed top-auto right-4 bottom-4 left-4 z-[70] m-0 flex w-auto flex-col items-stretch gap-2 overflow-visible border-0 bg-transparent p-0 text-text sm:left-auto sm:w-96 max-md:bottom-[calc(72px+env(safe-area-inset-bottom,0px))]"
    >
      {toasts.map((t) => (
        <ToastView key={t.id} toast={t} />
      ))}
    </div>
  );
}
