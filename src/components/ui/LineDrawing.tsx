// Small line drawings in the contour style (12.10.7): a compass, a trail, a summit flag, a tent and
// a telescope, for empty states and milestones. Drawn in the theme's ink with one accent detail
// and a few contour lines behind, so they belong to the same map as the page texture. No images,
// no mascot. Decorative: name what they stand for in the text beside them.
import { cx } from "./cx";

export type DrawingName = "compass" | "trail" | "flag" | "tent" | "telescope";

interface Shape {
  /** Contour lines behind the drawing. */
  terrain: string[];
  /** The drawing itself, in ink. */
  ink: string[];
  /** One detail in the accent (a needle, the flag's cloth, a star). */
  accent: string[];
  /** Dashed ink (a trail). */
  dashed?: string[];
}

const SHAPES: Record<DrawingName, Shape> = {
  compass: {
    terrain: [
      "M4 70 C 16 62, 28 72, 40 67 S 64 60, 76 66",
      "M10 77 C 22 71, 34 78, 46 74 S 66 70, 76 73",
    ],
    ink: [
      "M40 12 A 24 24 0 1 1 39.9 12",
      "M40 17 A 19 19 0 1 1 39.9 17",
      "M40 12 L40 17 M64 36 L59 36 M40 60 L40 55 M16 36 L21 36",
      "M40 36 L44 39 L40 54 L36 39 Z",
    ],
    accent: ["M40 18 L44 33 L40 36 L36 33 Z"],
  },
  trail: {
    terrain: [
      "M2 44 C 14 34, 26 32, 38 38 S 60 46, 78 34",
      "M2 54 C 16 46, 28 44, 40 50 S 62 56, 78 46",
      "M2 64 C 18 58, 30 56, 42 61 S 64 66, 78 58",
    ],
    ink: ["M12 72 m-2.5 0 a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0"],
    dashed: ["M12 72 C 24 66, 20 56, 32 52 S 52 44, 48 32 S 58 18, 66 16"],
    accent: ["M66 16 L66 4 L75 7.5 L66 11"],
  },
  flag: {
    terrain: [
      "M4 72 C 16 58, 28 40, 40 30 C 52 40, 64 58, 76 72",
      "M16 72 C 24 60, 32 49, 40 43 C 48 49, 56 60, 64 72",
      "M28 72 C 32 65, 36 59, 40 56 C 44 59, 48 65, 52 72",
    ],
    ink: ["M40 30 L40 8"],
    accent: ["M40 8 L55 12.5 L40 17"],
  },
  tent: {
    terrain: [
      "M2 50 C 14 40, 28 38, 42 44 S 64 50, 78 40",
      "M2 60 C 16 54, 28 52, 40 55 S 62 60, 78 54",
    ],
    ink: [
      "M6 70 L74 70",
      "M16 70 L37 32 L58 70",
      "M37 32 L41 25",
      "M31 70 L37 56 L43 70",
      "M16 70 L9 66 M58 70 L65 66",
    ],
    accent: ["M63 64 C 61 60, 66 58, 64 54 C 69 57, 70 62, 66 65 Z"],
  },
  telescope: {
    terrain: ["M2 74 C 16 68, 28 70, 40 72 S 64 70, 78 66", "M8 62 C 20 58, 30 60, 38 62"],
    ink: [
      "M22 45 L52 26 L56 33 L26 52 Z",
      "M22 45 L17 48 L20 54 L26 52",
      "M39 43 L30 72 M39 43 L48 72 M39 43 L39 72",
    ],
    accent: ["M66 6 L66 18 M60 12 L72 12", "M58 22 L58.1 22 M73 24 L73.1 24"],
  },
};

interface LineDrawingProps {
  name: DrawingName;
  /** Size in px (the drawing is square). */
  size?: number;
  className?: string;
}

export function LineDrawing({ name, size = 72, className }: LineDrawingProps) {
  const shape = SHAPES[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      aria-hidden="true"
      data-drawing={name}
      className={cx("shrink-0", className)}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g stroke="var(--contour-strong)" strokeWidth={1}>
        {shape.terrain.map((d) => (
          <path key={d} d={d} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g stroke="var(--text-muted)" strokeWidth={1.6}>
        {shape.ink.map((d) => (
          <path key={d} d={d} vectorEffect="non-scaling-stroke" />
        ))}
        {shape.dashed?.map((d) => (
          <path key={d} d={d} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g stroke="var(--accent)" strokeWidth={1.8} fill="var(--accent-soft)">
        {shape.accent.map((d) => (
          <path key={d} d={d} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
    </svg>
  );
}
