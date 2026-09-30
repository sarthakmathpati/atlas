// The horizon line (F31, 12.10.9): a 2 px accent line that shrinks from full width to nothing as
// a focus block or a timed round runs out. It moves in 5-second steps with no animation, and turns
// dotted near the end (lib/focus/horizon.ts). With a label it is a progress bar for screen readers.
import { horizonDotted, horizonFraction, horizonRemainingMs } from "@/lib/focus/horizon";
import { cx } from "./cx";

interface HorizonLineProps {
  elapsedMs: number;
  totalMs: number;
  /** Accessible name ("Time left for this prompt"); without one the line is decorative. */
  label?: string;
  className?: string;
}

export function HorizonLine({ elapsedMs, totalMs, label, className }: HorizonLineProps) {
  const fraction = horizonFraction(elapsedMs, totalMs);
  const dotted = horizonDotted(elapsedMs, totalMs);
  const a11y = label
    ? {
        role: "progressbar",
        "aria-label": label,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": Math.round(fraction * 100),
        "aria-valuetext": `${Math.ceil(horizonRemainingMs(elapsedMs, totalMs) / 60_000)} min left`,
      }
    : { "aria-hidden": true as const };
  return (
    <div {...a11y} data-horizon={dotted ? "dotted" : "solid"} className={cx("h-0.5", className)}>
      <div
        className={cx("h-full", dotted ? "horizon-dotted" : "bg-accent")}
        style={{ width: `${fraction * 100}%` }}
      />
    </div>
  );
}
