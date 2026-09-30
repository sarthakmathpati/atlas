// Small pieces shared by the problem library, the workspace, Review and Mistakes.
import { Star } from "lucide-react";
import { cx } from "@/components/ui/cx";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { RESULT_LABEL, RESULT_SHORT, type ReviewInfo } from "@/lib/problems/progress";
import type { AttemptResult, ProblemState } from "@/lib/types";
import {
  PROBLEM_GLYPH,
  PROBLEM_STATUS_LABEL,
  problemStatusKey,
  RESULT_ICON,
  RESULT_TONE,
} from "./problemUi";

/** Problem status with the same glyph shapes as concepts: ring, half, disc. */
export function ProblemStatusGlyph({
  state,
  size = 14,
  className,
}: {
  state: ProblemState | undefined;
  size?: number;
  className?: string;
}) {
  const key = problemStatusKey(state);
  return (
    <StatusGlyph
      status={PROBLEM_GLYPH[key]}
      size={size}
      title={PROBLEM_STATUS_LABEL[key]}
      className={className}
    />
  );
}

/** An attempt result: icon plus words (never color alone). */
export function ResultLabel({
  result,
  short,
  chip,
  className,
}: {
  result: AttemptResult | undefined;
  short?: boolean;
  /** As a pill on the sunken fill, like the other chips in a row. */
  chip?: boolean;
  className?: string;
}) {
  if (!result) return <span className={cx("text-faint", className)}>No result</span>;
  const Icon = RESULT_ICON[result];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap",
        chip && "h-6 rounded-full bg-surface-sunken pr-2.5 pl-2 text-xs font-medium",
        className,
      )}
    >
      <Icon size={15} aria-hidden="true" className={cx("shrink-0", RESULT_TONE[result])} />
      <span className="text-text">{short ? RESULT_SHORT[result] : RESULT_LABEL[result]}</span>
    </span>
  );
}

/** "Due today" in the accent color, "Overdue 3 days" in the warning color, the rest muted. */
export function ReviewText({ info, className }: { info: ReviewInfo; className?: string }) {
  if (info.kind === "none") return <span className={cx("text-faint", className)}>–</span>;
  const label =
    info.kind === "due"
      ? info.daysLate <= 0
        ? "Due today"
        : `Overdue ${info.daysLate} ${info.daysLate === 1 ? "day" : "days"}`
      : info.kind === "upcoming"
        ? info.inDays === 1
          ? "Tomorrow"
          : `In ${info.inDays} days`
        : info.kind === "mastered"
          ? "Mastered"
          : "Not in review";
  return (
    <span
      className={cx(
        "whitespace-nowrap",
        info.kind === "due" && info.daysLate <= 0 && "font-medium text-accent",
        info.kind === "due" && info.daysLate > 0 && "font-medium text-warning",
        info.kind === "mastered" && "text-success",
        (info.kind === "upcoming" || info.kind === "off") && "text-muted",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function StarToggle({
  starred,
  onToggle,
  label,
  className,
}: {
  starred: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={starred}
      aria-label={starred ? `Unstar ${label}` : `Star ${label}`}
      title={starred ? "Starred" : "Star"}
      onClick={onToggle}
      className={cx(
        "grid size-8 shrink-0 place-items-center rounded-control transition-colors hover:bg-surface-sunken max-md:size-11",
        starred ? "text-warning" : "text-faint hover:text-muted",
        className,
      )}
    >
      <Star size={16} aria-hidden="true" fill={starred ? "currentColor" : "none"} />
    </button>
  );
}
