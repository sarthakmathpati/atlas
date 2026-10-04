// The shrinking disc (F32 "time you can see"): the time left of a planned stretch as a filled
// wedge that shrinks clockwise toward twelve o'clock. Like the horizon line it moves in whole
// 5-second steps and never animates; when the time is up it stays empty and says how far over it
// is, in plain words and never in red (lib/adhd/time.ts).
import { discFraction, discText } from "@/lib/adhd/time";
import { cx } from "./cx";

const SIZE = { sm: 30, md: 52, lg: 84 } as const;

function wedge(fraction: number, c: number, r: number): string | null {
  if (fraction <= 0) return null;
  const angle = fraction * 2 * Math.PI;
  const x = c + r * Math.sin(angle);
  const y = c - r * Math.cos(angle);
  const large = fraction > 0.5 ? 1 : 0;
  return `M ${c} ${c} L ${c} ${c - r} A ${r} ${r} 0 ${large} 1 ${x.toFixed(3)} ${y.toFixed(3)} Z`;
}

interface DiscTimerProps {
  elapsedMs: number;
  totalMs: number;
  size?: keyof typeof SIZE;
  /** What the time is for ("Time left for this prompt"); joined to the time for screen readers. */
  label?: string;
  /** Show the time beside the disc (sm) or under it (lg); the md disc puts it beside. */
  showText?: boolean;
  /** Paused clocks look quieter. */
  running?: boolean;
  className?: string;
}

export function DiscTimer({
  elapsedMs,
  totalMs,
  size = "md",
  label,
  showText = true,
  running = true,
  className,
}: DiscTimerProps) {
  const px = SIZE[size];
  const c = px / 2;
  const r = c - 1;
  const fraction = discFraction(elapsedMs, totalMs);
  const text = discText(elapsedMs, totalMs);
  const path = fraction >= 1 ? null : wedge(fraction, c, r - 1);
  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={label ? `${label}: ${text.label}` : text.label}
      data-testid="disc-timer"
      data-fraction={fraction.toFixed(3)}
      className={cx(
        "inline-flex items-center gap-2.5",
        size === "lg" && "flex-col gap-1.5 text-center",
        className,
      )}
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        aria-hidden="true"
        className={cx("shrink-0", !running && "opacity-70")}
      >
        <circle cx={c} cy={c} r={r} fill="var(--surface-sunken)" stroke="var(--rule)" />
        {fraction >= 1 ? (
          <circle cx={c} cy={c} r={r - 1} fill="var(--accent)" />
        ) : (
          path && <path d={path} fill="var(--accent)" />
        )}
      </svg>
      {showText && (
        <span aria-hidden="true" className="flex flex-col leading-tight">
          <span
            className={cx(
              "font-display font-semibold text-text tabular-nums",
              size === "sm" ? "text-base" : "text-lg",
            )}
          >
            {text.main}
          </span>
          <span className="text-xs text-muted">{text.sub}</span>
        </span>
      )}
    </div>
  );
}
