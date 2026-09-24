// A static, whole-map preview drawn from the precomputed layout (the real zoomable map arrives in
// Phase 4). Regions are tinted by subject, every concept is a small dot, and faint lines show
// prerequisites inside each subject. Hover or click a region to highlight a subject.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { layout } from "@/data/layout";
import { concepts, subjects } from "@/data/syllabus";
import type { Importance } from "@/lib/types";

const { minX, minY, maxX, maxY } = layout.bounds;
const WIDTH = maxX - minX;
const HEIGHT = maxY - minY;

/** All within-subject prerequisite lines as one path (one DOM node keeps it fast). */
const EDGE_PATH = (() => {
  const parts: string[] = [];
  for (const c of concepts) {
    const b = layout.positions[c.id];
    if (!b) continue;
    for (const p of c.prereqs) {
      if (!p.startsWith(`${c.subjectId}.`)) continue;
      const a = layout.positions[p];
      if (a) parts.push(`M${a.x},${a.y}L${b.x},${b.y}`);
    }
  }
  return parts.join("");
})();

/** Concept dots grouped by importance, each group drawn as one path of circles. */
const DOT_PATHS = (() => {
  const groups: Record<Importance, string[]> = { must: [], important: [], advanced: [] };
  for (const c of concepts) {
    const p = layout.positions[c.id];
    if (!p) continue;
    const r = layout.sizes.bubbleRadius[c.importance];
    groups[c.importance].push(
      `M${p.x - r},${p.y}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`,
    );
  }
  return {
    must: groups.must.join(""),
    important: groups.important.join(""),
    advanced: groups.advanced.join(""),
  };
})();

interface MapPreviewProps {
  selected: string | null;
  onSelect: (subjectId: string) => void;
}

export function MapPreview({ selected, onSelect }: MapPreviewProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [scale, setScale] = useState(0.1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const width = el.getBoundingClientRect().width;
      if (width > 0) setScale(width / WIDTH);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Labels stay about 12 px on screen (a little smaller on phones) whatever the map's width.
  const labelPx = scale * WIDTH < 520 ? 10.5 : 12.5;
  const labelSize = labelPx / scale;
  /** Keeps a centered label inside the map's edges (width estimated from its length). */
  const clampX = (x: number, text: string) => {
    const half = (text.length * labelSize * 0.56) / 2 + labelSize * 0.4;
    return Math.min(Math.max(x, minX + half), maxX - half);
  };
  const hairline = 1 / scale;
  const regions = useMemo(
    () => subjects.map((s) => ({ subject: s, region: layout.regions[s.id]! })),
    [],
  );

  return (
    <svg
      ref={ref}
      viewBox={`${minX} ${minY} ${WIDTH} ${HEIGHT}`}
      className="block h-auto w-full select-none"
      role="img"
      aria-label={`Preview of the knowledge map: ${subjects.length} subject regions containing ${concepts.length} concepts.`}
    >
      <defs>
        <pattern id="preview-grid" width={240} height={240} patternUnits="userSpaceOnUse">
          <path d="M240 0H0V240" fill="none" stroke="var(--grid-line)" strokeWidth={hairline} />
        </pattern>
      </defs>
      <rect x={minX} y={minY} width={WIDTH} height={HEIGHT} fill="url(#preview-grid)" />

      {regions.map(({ subject, region }) => {
        const active = subject.id === selected;
        const hot = subject.id === hovered;
        return (
          <path
            key={subject.id}
            d={region.path}
            className="cursor-pointer transition-[fill-opacity,stroke-opacity] duration-150"
            style={{ "--h": subject.regionHue } as CSSProperties}
            fill="hsl(var(--h) var(--region-saturation) var(--region-lightness))"
            fillOpacity={active ? 0.2 : hot ? 0.14 : 0.08}
            stroke="hsl(var(--h) var(--region-saturation) var(--region-lightness))"
            strokeOpacity={active ? 0.9 : hot ? 0.6 : 0.3}
            strokeWidth={(active ? 2 : 1.25) * hairline}
            onMouseEnter={() => setHovered(subject.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelect(subject.id)}
          >
            <title>{subject.name}</title>
          </path>
        );
      })}

      <path
        d={EDGE_PATH}
        fill="none"
        stroke="var(--rule-strong)"
        strokeOpacity={0.55}
        strokeWidth={0.6 * hairline}
        pointerEvents="none"
      />
      <g fill="var(--status-not-started-stroke)" pointerEvents="none">
        <path d={DOT_PATHS.must} fillOpacity={0.85} />
        <path d={DOT_PATHS.important} fillOpacity={0.7} />
        <path d={DOT_PATHS.advanced} fillOpacity={0.55} />
      </g>

      <g
        pointerEvents="none"
        fontFamily="var(--font-condensed)"
        fontWeight={600}
        textAnchor="middle"
      >
        {regions.map(({ subject, region }) => (
          <text
            key={subject.id}
            x={clampX(region.cx, subject.shortName)}
            y={region.cy}
            dy="0.35em"
            fontSize={labelSize}
            fill="var(--text)"
            fillOpacity={selected && selected !== subject.id ? 0.55 : 0.95}
            stroke="var(--canvas)"
            strokeWidth={labelSize * 0.32}
            strokeLinejoin="round"
            paintOrder="stroke"
          >
            {subject.shortName}
          </text>
        ))}
      </g>
    </svg>
  );
}
