// ProgressRing, ProgressBar, SegmentedBar and Tile (section 12.7).
import type { ReactNode } from "react";
import type { Status } from "@/lib/types";
import { cx } from "./cx";
import { STATUS_LABEL, STATUS_ORDER } from "./labels";

interface ProgressRingProps {
  /** 0 to 1. */
  value: number;
  size?: number;
  thickness?: number;
  label: string;
  /** Text in the middle, for example "42". */
  children?: ReactNode;
  tone?: "accent" | "strong";
  className?: string;
}

export function ProgressRing({
  value,
  size = 48,
  thickness = 4,
  label,
  children,
  tone = "accent",
  className,
}: ProgressRingProps) {
  const v = Math.min(1, Math.max(0, value));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="img"
      aria-label={label}
      className={cx("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--rule)"
          strokeWidth={thickness}
        />
        {v > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tone === "strong" ? "var(--status-strong-stroke)" : "var(--accent)"}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${c * v} ${c}`}
            style={{ transition: "stroke-dasharray 400ms var(--ease-out)" }}
          />
        )}
      </svg>
      {children !== undefined && (
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center text-sm font-semibold text-text tabular-nums"
        >
          {children}
        </span>
      )}
    </div>
  );
}

interface ProgressBarProps {
  /** 0 to 1. */
  value: number;
  label: string;
  className?: string;
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cx("h-2 overflow-hidden rounded-full bg-surface-sunken", className)}
    >
      <div
        className="h-full rounded-full bg-accent"
        style={{ width: `${v * 100}%`, transition: "width 300ms var(--ease-out)" }}
      />
    </div>
  );
}

const SEGMENT_FILL: Record<Status, string> = {
  not_started: "var(--rule)",
  learning: "var(--status-learning-fill)",
  strong: "var(--status-strong-fill)",
  fading: "var(--status-fading-fill)",
};

interface SegmentedBarProps {
  counts: Partial<Record<Status, number>>;
  /** What the counts are of, for the accessible label ("concepts"). */
  noun?: string;
  className?: string;
  height?: number;
}

/** A thin bar showing the mix of statuses (topic bubbles, dashboard status mix). */
export function SegmentedBar({
  counts,
  noun = "concepts",
  className,
  height = 6,
}: SegmentedBarProps) {
  const total = STATUS_ORDER.reduce((n, s) => n + (counts[s] ?? 0), 0);
  const label =
    total === 0
      ? `No ${noun}`
      : STATUS_ORDER.filter((s) => (counts[s] ?? 0) > 0)
          .map((s) => `${counts[s]} ${STATUS_LABEL[s].toLowerCase()}`)
          .join(", ");
  return (
    <div
      role="img"
      aria-label={label}
      className={cx("flex w-full gap-px overflow-hidden rounded-full bg-surface-sunken", className)}
      style={{ height }}
    >
      {total > 0 &&
        // Strong first, then learning, fading and not started, so progress reads left to right.
        (["strong", "learning", "fading", "not_started"] as Status[]).map((s) => {
          const n = counts[s] ?? 0;
          if (n === 0) return null;
          return (
            <div
              key={s}
              style={{ flexGrow: n, flexBasis: 0, background: SEGMENT_FILL[s] }}
              className="min-w-[2px]"
            />
          );
        })}
    </div>
  );
}

interface TileProps {
  title: ReactNode;
  children?: ReactNode;
  href?: string;
  onClick?: () => void;
  /** A subtle outline for tiles that need attention (for example no hard problem solved). */
  emphasis?: boolean;
  className?: string;
  footer?: ReactNode;
}

/** A compact bordered tile for grids (pattern grid, practice hub). */
export function Tile({ title, children, href, onClick, emphasis, className, footer }: TileProps) {
  const classes = cx(
    "flex flex-col gap-1 rounded-panel border bg-surface p-3 text-left",
    emphasis ? "border-dashed border-rule-strong" : "border-rule",
    (href || onClick) && "transition-colors hover:border-rule-strong hover:bg-surface-sunken",
    className,
  );
  const body = (
    <>
      <span className="text-base font-medium text-text">{title}</span>
      {children && <span className="text-sm text-muted">{children}</span>}
      {footer && <span className="mt-auto pt-2">{footer}</span>}
    </>
  );
  if (href)
    return (
      <a href={href} className={classes}>
        {body}
      </a>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={classes}>
        {body}
      </button>
    );
  return <div className={classes}>{body}</div>;
}
