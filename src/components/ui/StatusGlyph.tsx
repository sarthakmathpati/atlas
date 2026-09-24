// Status glyphs (section 12.3): color AND shape, the same everywhere (map, lists, chips).
//   not started  hollow ring
//   learning     ring with the lower half filled
//   strong       solid disc (with a small check cut-out at 16 px and larger)
//   fading       solid disc with a dashed outer ring
import { useId } from "react";
import type { Status } from "@/lib/types";

const FILL: Record<Status, string> = {
  not_started: "var(--status-not-started-fill)",
  learning: "var(--status-learning-fill)",
  strong: "var(--status-strong-fill)",
  fading: "var(--status-fading-fill)",
};

const STROKE: Record<Status, string> = {
  not_started: "var(--status-not-started-stroke)",
  learning: "var(--status-learning-stroke)",
  strong: "var(--status-strong-stroke)",
  fading: "var(--status-fading-stroke)",
};

interface StatusGlyphProps {
  status: Status;
  size?: number;
  /** Adds an accessible label; otherwise the glyph is decorative (label it nearby). */
  title?: string;
  className?: string;
}

export function StatusGlyph({ status, size = 14, title, className }: StatusGlyphProps) {
  const labelled = Boolean(title);
  const maskId = `sg${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const cutCheck = status === "strong" && size >= 16;
  // Draw on a 24-unit grid; the stroke stays visually about 1.5 px at any size.
  const sw = Math.max(1.6, (1.5 * 24) / size);
  const r = status === "fading" ? 7 : 9.5;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      style={{ flexShrink: 0 }}
    >
      {status === "not_started" && (
        <circle cx={12} cy={12} r={r} fill="none" stroke={STROKE.not_started} strokeWidth={sw} />
      )}
      {status === "learning" && (
        <>
          <path d={`M${12 - r},12 A${r},${r} 0 0,0 ${12 + r},12 Z`} fill={FILL.learning} />
          <circle cx={12} cy={12} r={r} fill="none" stroke={STROKE.learning} strokeWidth={sw} />
        </>
      )}
      {status === "strong" && (
        <>
          {cutCheck && (
            <mask id={maskId}>
              <rect width={24} height={24} fill="white" />
              <path
                d="M7.6 12.3l3 3 5.8-6.2"
                fill="none"
                stroke="black"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </mask>
          )}
          <circle
            cx={12}
            cy={12}
            r={r}
            fill={FILL.strong}
            stroke={STROKE.strong}
            strokeWidth={sw}
            mask={cutCheck ? `url(#${maskId})` : undefined}
          />
        </>
      )}
      {status === "fading" && (
        <>
          <circle
            cx={12}
            cy={12}
            r={r}
            fill={FILL.fading}
            stroke={STROKE.fading}
            strokeWidth={sw * 0.8}
          />
          <circle
            cx={12}
            cy={12}
            r={10.6}
            fill="none"
            stroke={STROKE.fading}
            strokeWidth={Math.max(1.4, sw * 0.8)}
            strokeDasharray="2.6 2.4"
          />
        </>
      )}
    </svg>
  );
}
