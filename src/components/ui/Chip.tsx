// Chips (section 12.7): status, difficulty, importance, pattern and tag.
// Difficulty is deliberately neutral (1 to 3 small bars plus the word) so it is never confused
// with a status color (section 12.3).
import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { Difficulty, Importance, Status } from "@/lib/types";
import { cx } from "./cx";
import { DIFFICULTY_LABEL, IMPORTANCE_LABEL, STATUS_LABEL } from "./labels";
import { StatusGlyph } from "./StatusGlyph";

// Pills on a sunken fill (12.10.5): tone, not hairlines, sets them apart.
const BASE =
  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-transparent px-2.5 text-xs font-medium whitespace-nowrap";

interface ChipProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Chip({ children, className, title }: ChipProps) {
  // A dashed chip marks something unusual; its outline takes the chip's text color.
  const dashed = className?.includes("border-dashed");
  return (
    <span
      title={title}
      className={cx(
        BASE,
        "bg-surface-sunken text-muted",
        dashed && "border-current bg-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusChip({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cx(BASE, "bg-surface-sunken pl-1.5 text-text", className)}>
      <StatusGlyph status={status} size={12} />
      {STATUS_LABEL[status]}
    </span>
  );
}

const BARS: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

export function DifficultyChip({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  const n = BARS[difficulty];
  return (
    <span className={cx(BASE, "bg-surface-sunken text-text", className)}>
      <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={i * 3.5}
            y={6 - i * 3}
            width={2.4}
            height={4 + i * 3}
            rx={0.6}
            fill="currentColor"
            opacity={i < n ? 0.9 : 0.22}
          />
        ))}
      </svg>
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

export function ImportanceChip({
  importance,
  className,
}: {
  importance: Importance;
  className?: string;
}) {
  return (
    <span
      className={cx(
        BASE,
        importance === "must" && "bg-surface-sunken font-semibold text-text",
        importance === "important" && "bg-surface-sunken text-muted",
        importance === "advanced" && "border-dashed border-rule-strong bg-transparent text-muted",
        className,
      )}
    >
      {IMPORTANCE_LABEL[importance]}
    </span>
  );
}

interface PatternChipProps {
  label: string;
  /** In-app link (for example `#/concept/<id>`). */
  href?: string;
  className?: string;
}

export function PatternChip({ label, href, className }: PatternChipProps) {
  const classes = cx(BASE, "bg-accent-soft text-accent", href && "hover:underline", className);
  return href ? (
    <a href={href} className={classes}>
      {label}
    </a>
  ) : (
    <span className={classes}>{label}</span>
  );
}

interface TagChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export function TagChip({ label, onRemove, className }: TagChipProps) {
  return (
    <span className={cx(BASE, "bg-surface-sunken text-text", onRemove && "pr-0.5", className)}>
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="relative grid size-5 place-items-center rounded-full text-muted hover:bg-rule hover:text-text before:absolute before:-inset-2 before:content-['']"
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
