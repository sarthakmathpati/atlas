// A subject's emblem (12.10.7): its contour picture stroked in the subject mark on its tint, and
// the small square mark (12.10.3). Subject colors are never a round dot (round means status) and
// never stand alone: show the subject's name next to them, or label the emblem.
import { useId } from "react";
import { EMBLEM_SIZE, emblemLines } from "@/lib/art/emblem";
import { cx } from "./cx";

interface SubjectEmblemProps {
  subjectId: string;
  /** Size in px (the emblem scales; its shape stays the same). */
  size?: number;
  /** Accessible name; without it the emblem is decorative (name the subject nearby). */
  label?: string;
  /** "tile": on the subject's tint in a rounded square; "bare": lines only. */
  variant?: "tile" | "bare";
  className?: string;
}

export function SubjectEmblem({
  subjectId,
  size = 40,
  label,
  variant = "tile",
  className,
}: SubjectEmblemProps) {
  const lines = emblemLines(subjectId);
  const clipId = `emblem${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const tile = variant === "tile";
  return (
    <svg
      data-subject={subjectId}
      width={size}
      height={size}
      viewBox={`0 0 ${EMBLEM_SIZE} ${EMBLEM_SIZE}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx("shrink-0", className)}
    >
      {tile && (
        <>
          <clipPath id={clipId}>
            <rect width={EMBLEM_SIZE} height={EMBLEM_SIZE} rx={EMBLEM_SIZE * 0.22} />
          </clipPath>
          <rect
            width={EMBLEM_SIZE}
            height={EMBLEM_SIZE}
            rx={EMBLEM_SIZE * 0.22}
            fill="var(--subject-tint)"
          />
        </>
      )}
      <g
        fill="none"
        stroke="var(--subject-mark)"
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath={tile ? `url(#${clipId})` : undefined}
      >
        {lines.map((line, i) => (
          <path
            key={i}
            d={line.d}
            strokeWidth={size < 32 ? (line.major ? 1.1 : 0.75) : line.major ? 1.5 : 1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}

/** The small square subject mark that sits before a subject's name. */
export function SubjectMark({ subjectId, className }: { subjectId: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-subject={subjectId}
      className={cx("inline-block size-2.5 shrink-0 rounded-[3px] bg-subject", className)}
    />
  );
}
