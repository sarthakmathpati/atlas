// Kbd, EmptyState, Skeleton and Callout (section 12.7).
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";

/** A keyboard key, for shortcut hints. Uses the interface font (never monospace for labels). */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-rule border-b-2 bg-surface px-1 font-sans text-[11px] font-medium text-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  /** Buttons that invite the next step. */
  actions?: ReactNode;
  className?: string;
  /** Compact version for panels and lists. */
  compact?: boolean;
}

/** Empty states invite action (section 12.8). */
export function EmptyState({
  icon: Icon,
  title,
  children,
  actions,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-start rounded-panel border border-dashed border-rule-strong",
        compact ? "gap-2 p-4" : "gap-3 p-6 sm:p-8",
        className,
      )}
    >
      {Icon && (
        <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
          <Icon size={20} aria-hidden="true" />
        </span>
      )}
      <div className="max-w-[60ch]">
        <p className={cx("font-semibold text-text", compact ? "text-base" : "text-md")}>{title}</p>
        {children && <div className="mt-1 text-base text-muted">{children}</div>}
      </div>
      {actions && <div className="mt-1 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** A static placeholder block while data loads (no looping shimmer, section 12.6). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("rounded-control bg-surface-sunken", className)} />;
}

/** A page-shaped skeleton: header line plus a few rows. */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-panel border border-rule bg-surface">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-rule px-4 py-4 last:border-b-0"
          >
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface CalloutProps {
  tone?: "info" | "warning" | "danger";
  icon?: LucideIcon;
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** An in-flow notice (storage notices, backup reminder). */
export function Callout({
  tone = "info",
  icon: Icon,
  title,
  children,
  actions,
  className,
}: CalloutProps) {
  return (
    <div
      className={cx(
        "flex flex-col gap-3 rounded-panel border px-4 py-3 sm:flex-row sm:items-center",
        tone === "info" && "border-rule bg-info-soft",
        tone === "warning" && "border-rule bg-warning-soft",
        tone === "danger" && "border-danger/40 bg-danger-soft",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        {Icon && (
          <Icon
            size={18}
            aria-hidden="true"
            className={cx(
              "mt-0.5 shrink-0",
              tone === "info" && "text-accent",
              tone === "warning" && "text-warning",
              tone === "danger" && "text-danger",
            )}
          />
        )}
        <div className="min-w-0 text-base">
          {title && <p className="font-medium text-text">{title}</p>}
          <div className="text-muted">{children}</div>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}
