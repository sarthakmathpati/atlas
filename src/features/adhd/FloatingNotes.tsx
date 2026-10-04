// Small notes that float at the bottom right (F32): the question at the end of a 2-minute start,
// the 90-minute check-in, the if-then reminder and Claude's word at a block's start. They sit in
// the toasts' corner, just above them (their height lifts the toasts through
// `--floating-notes-h`), so they never cover a page's header or toolbar. They stay in the
// browser's top layer, so they can be answered above an open dialog, and they never take focus:
// each is a polite live region.
import type { LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { POPOVER_MANUAL, showInTopLayer } from "@/components/ui/topLayer";

export function FloatingNotes({ children, count }: { children: ReactNode; count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // Re-show on every change, so the notes sit above any dialog opened since.
  useLayoutEffect(() => {
    if (count > 0) showInTopLayer(ref.current);
  });
  // The toasts sit just above the notes.
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const h = el.offsetHeight;
      root.style.setProperty("--floating-notes-h", h > 0 ? `${h + 8}px` : "0px");
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--floating-notes-h");
    };
  }, []);
  return (
    <div
      ref={ref}
      popover={POPOVER_MANUAL}
      data-testid="adhd-notes"
      className="pointer-events-none fixed top-auto right-4 bottom-4 left-4 z-[65] m-0 flex w-auto flex-col items-stretch gap-2 overflow-visible border-0 bg-transparent p-0 text-text sm:left-auto sm:w-96 max-md:bottom-[calc(72px+env(safe-area-inset-bottom,0px))]"
    >
      {children}
    </div>
  );
}

export function Note({
  label,
  title,
  icon: Icon,
  children,
  actions,
  className,
}: {
  /** The note's name for screen readers. */
  label: string;
  title: ReactNode;
  icon?: LucideIcon;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      role="region"
      aria-label={label}
      className={cx(
        "pointer-events-auto rounded-panel border border-layer-edge bg-surface-raised px-4 py-3 text-base shadow-float",
        className,
      )}
    >
      <div aria-live="polite" className="flex gap-3">
        {Icon && <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-text">{title}</p>
          {children && <div className="mt-0.5 text-muted">{children}</div>}
        </div>
      </div>
      {actions && <div className="mt-3 flex flex-wrap justify-end gap-2">{actions}</div>}
    </section>
  );
}
