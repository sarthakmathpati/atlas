// Small pieces shared by the problem library, the workspace, Review and Mistakes.
import { Sparkles, Star, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
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
  className,
}: {
  result: AttemptResult | undefined;
  short?: boolean;
  className?: string;
}) {
  if (!result) return <span className={cx("text-faint", className)}>No result</span>;
  const Icon = RESULT_ICON[result];
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap", className)}>
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

/**
 * A Claude feature that arrives in phase 6: the button explains what it will do instead of
 * pretending to work (the honest placeholder the rest of the app uses too).
 */
export function LaterClaudeButton({
  label,
  title,
  children,
  icon = Sparkles,
  size = "md",
  variant = "secondary",
  className,
  compactOnMobile,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  size?: "sm" | "md";
  variant?: "secondary" | "ghost";
  className?: string;
  /** Show only the icon below 1280 px (the label stays for screen readers and as a title). */
  compactOnMobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size={size}
        variant={variant}
        icon={icon}
        onClick={() => setOpen(true)}
        className={cx(compactOnMobile && "max-xl:px-2.5", className)}
        title={compactOnMobile ? label : undefined}
      >
        <span className={cx(compactOnMobile && "max-xl:sr-only")}>{label}</span>
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        size="sm"
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Got it
          </Button>
        }
      >
        <div className="space-y-3 px-4 py-4 text-base text-muted sm:px-5">
          {children}
          <p>This arrives with the Claude features in phase 6.</p>
        </div>
      </Dialog>
    </>
  );
}
