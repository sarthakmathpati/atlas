// What the map draws under its bubbles, in map coordinates (a React Flow viewport portal):
// subject region outlines, subject names in the middle zoom, bundled cross-subject lines far out,
// topic prerequisite arrows in the middle, concept dots in the middle, and near in, prerequisite
// lines (solid, small arrowhead) and cross-subject connections (dashed). Lines touching what is
// emphasised (hover, focus mode, a path) are drawn in the accent ink; the rest step back.
import { ViewportPortal } from "@xyflow/react";
import { memo, useEffect, useMemo, useState, type CSSProperties } from "react";
import { layout } from "@/data/layout";
import { concepts as seedConcepts, dependentsOf, subjects, topicById } from "@/data/syllabus";
import type { Status } from "@/lib/types";
import { findConcept } from "@/stores/customConceptStore";
import type { Point } from "@/stores/mapStore";
import type { MapModel } from "./useMapModel";
import { BUBBLE_RADIUS } from "./useMapModel";
import { useMapView } from "./viewStore";

const ARROW = 7;

/** A line from bubble a to bubble b, trimmed at their edges, plus an arrowhead at b. */
function segment(a: Point, ra: number, b: Point, rb: number, arrow: boolean) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < ra + rb + 6) return null;
  const ux = dx / len;
  const uy = dy / len;
  const sx = a.x + ux * (ra + 2);
  const sy = a.y + uy * (ra + 2);
  const ex = b.x - ux * (rb + 2);
  const ey = b.y - uy * (rb + 2);
  const f = (v: number) => Math.round(v * 10) / 10;
  const line = `M${f(sx)},${f(sy)}L${f(ex)},${f(ey)}`;
  if (!arrow) return { line, head: "" };
  const bx = ex - ux * ARROW;
  const by = ey - uy * ARROW;
  const px = -uy * (ARROW / 2);
  const py = ux * (ARROW / 2);
  return {
    line,
    head: `M${f(ex)},${f(ey)}L${f(bx + px)},${f(by + py)}L${f(bx - px)},${f(by - py)}Z`,
  };
}

/** Cross-subject connections bundled per pair of subjects (far zoom). */
const SUBJECT_PAIRS: { a: string; b: string; count: number }[] = (() => {
  const counts = new Map<string, number>();
  for (const c of seedConcepts) {
    for (const link of c.related) {
      const other = link.to.split(".")[0]!;
      if (other === c.subjectId || c.id > link.to) continue;
      const key = [c.subjectId, other].sort().join("|");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts].map(([key, count]) => {
    const [a, b] = key.split("|") as [string, string];
    return { a, b, count };
  });
})();

interface LayersProps {
  model: MapModel;
  /** Live positions of bubbles being dragged. */
  dragged: ReadonlyMap<string, Point>;
  /** Concepts on the path being shown (F25), for highlighting regions and topics far out. */
  pathIds: ReadonlySet<string> | null;
}

export const MapLayers = memo(function MapLayers({ model, dragged, pathIds }: LayersProps) {
  const level = useMapView((s) => s.level);
  const emphasis = useMapView((s) => s.emphasis);
  const inkEdges = useMapView((s) => s.inkEdges);
  const [inkTargets, setInkTargets] = useState<{ from: string; to: string[]; key: number } | null>(
    null,
  );

  const pos = (id: string): Point | undefined => dragged.get(id) ?? model.positions.get(id);

  // After the ink fill, draw the lines to concepts that this one made ready.
  useEffect(() => {
    if (!inkEdges) return;
    const to = (dependentsOf.get(inkEdges.from) ?? []).filter((id) => model.facts.get(id)?.ready);
    if (to.length === 0) return;
    const start = setTimeout(() => setInkTargets({ ...inkEdges, to }), 0);
    const end = setTimeout(() => setInkTargets(null), 1600);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, [inkEdges, model.facts]);

  const regionPaths = (
    <g className="map-regions">
      {subjects.map((s) => {
        const region = layout.regions[s.id];
        if (!region) return null;
        const on = model.subjectIds.includes(s.id);
        const hot =
          pathIds !== null
            ? [...pathIds].some((id) => id.startsWith(`${s.id}.`))
            : emphasis?.has(s.id);
        return (
          <path
            key={s.id}
            d={region.path}
            style={{ "--h": s.regionHue } as CSSProperties}
            className="map-region"
            data-off={!on || undefined}
            data-level={level}
            data-hot={hot || undefined}
          />
        );
      })}
    </g>
  );

  const middle = level === "middle";
  const near = level === "near";

  const topicArrows = useMemo(() => {
    if (!middle) return null;
    const on = new Set(model.topicIds);
    let lines = "";
    let heads = "";
    for (const id of model.topicIds) {
      const t = topicById.get(id)!;
      const b = layout.positions[id];
      if (!b) continue;
      for (const p of t.prereqTopics) {
        if (!on.has(p)) continue;
        const a = layout.positions[p];
        if (!a) continue;
        const seg = segment(a, layout.topics[p]!.r * 0.9, b, layout.topics[id]!.r * 0.9, true);
        if (!seg) continue;
        lines += seg.line;
        heads += seg.head;
      }
    }
    return { lines, heads };
  }, [middle, model.topicIds]);

  const dots = useMemo(() => {
    if (!middle) return null;
    const groups: Record<Status, string> = {
      not_started: "",
      learning: "",
      strong: "",
      fading: "",
    };
    const dim: Record<Status, string> = { not_started: "", learning: "", strong: "", fading: "" };
    const r = 7;
    for (const c of model.concepts) {
      const p = pos(c.id);
      const f = model.facts.get(c.id);
      if (!p || !f) continue;
      const d = `M${p.x - r},${p.y}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
      if (f.match) groups[f.status] += d;
      else dim[f.status] += d;
    }
    return { groups, dim };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [middle, model.concepts, model.facts, model.positions, dragged]);

  const conceptEdges = useMemo(() => {
    if (!near) return null;
    let lines = "";
    let heads = "";
    let hotLines = "";
    let hotHeads = "";
    let cross = "";
    let hotCross = "";
    for (const c of model.concepts) {
      const b = pos(c.id);
      if (!b) continue;
      const rb = BUBBLE_RADIUS[c.importance];
      for (const p of c.prereqs) {
        if (!model.conceptIds.has(p)) continue;
        const a = pos(p);
        const pc = findConcept(p);
        if (!a || !pc) continue;
        const hot = emphasis?.has(c.id) && emphasis.has(p);
        // Lines to other subjects cross the whole map: only drawn for what is emphasised.
        if (pc.subjectId !== c.subjectId && !hot) continue;
        const seg = segment(a, BUBBLE_RADIUS[pc.importance], b, rb, true);
        if (!seg) continue;
        if (hot) {
          hotLines += seg.line;
          hotHeads += seg.head;
        } else {
          lines += seg.line;
          heads += seg.head;
        }
      }
      for (const link of c.related) {
        if (c.id > link.to || !model.conceptIds.has(link.to)) continue;
        const a = pos(link.to);
        const lc = findConcept(link.to);
        if (!a || !lc) continue;
        const hot = emphasis?.has(c.id) && emphasis.has(link.to);
        if (lc.subjectId !== c.subjectId && !hot) continue;
        const seg = segment(b, rb, a, BUBBLE_RADIUS[lc.importance], false);
        if (!seg) continue;
        if (hot) hotCross += seg.line;
        else cross += seg.line;
      }
    }
    return { lines, heads, hotLines, hotHeads, cross, hotCross };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, model.concepts, model.conceptIds, model.positions, dragged, emphasis]);

  const inkPaths = useMemo(() => {
    if (!near || !inkTargets) return [];
    const a = pos(inkTargets.from);
    const from = findConcept(inkTargets.from);
    if (!a || !from) return [];
    return inkTargets.to.flatMap((id) => {
      const b = pos(id);
      const c = findConcept(id);
      if (!b || !c) return [];
      const seg = segment(a, BUBBLE_RADIUS[from.importance], b, BUBBLE_RADIUS[c.importance], false);
      return seg ? [{ id, d: seg.line }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, inkTargets, model.positions]);

  const far = level === "far";
  const bundles = far
    ? SUBJECT_PAIRS.filter(
        (p) => model.subjectIds.includes(p.a) && model.subjectIds.includes(p.b),
      ).map((p) => {
        const a = layout.regions[p.a]!;
        const b = layout.regions[p.b]!;
        // A gentle bow, so lines between neighbors don't sit on top of each other.
        const mx = (a.cx + b.cx) / 2 - (b.cy - a.cy) * 0.12;
        const my = (a.cy + b.cy) / 2 + (b.cx - a.cx) * 0.12;
        return {
          key: `${p.a}|${p.b}`,
          d: `M${a.cx},${a.cy}Q${mx},${my} ${b.cx},${b.cy}`,
          width: 1 + Math.log2(1 + p.count) * 0.9,
        };
      })
    : [];

  const { minX, minY, maxX, maxY } = layout.bounds;
  return (
    <ViewportPortal>
      <svg
        className="map-layers"
        width={maxX - minX}
        height={maxY - minY}
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        style={{ left: minX, top: minY }}
        aria-hidden="true"
      >
        {regionPaths}
        {far && (
          <g className="map-bundles">
            {bundles.map((b) => (
              <path key={b.key} d={b.d} style={{ strokeWidth: b.width }} />
            ))}
          </g>
        )}
        {middle && (
          <>
            <g className="map-subject-names">
              {subjects.map((s) => {
                const r = layout.regions[s.id];
                if (!r || !model.subjectIds.includes(s.id)) return null;
                return (
                  <text key={s.id} x={r.cx} y={r.top - 28} textAnchor="middle">
                    {s.name}
                  </text>
                );
              })}
            </g>
            <g>
              {model.topicIds.map((id) => {
                const p = layout.positions[id];
                const r = layout.topics[id]?.r;
                if (!p || !r) return null;
                return (
                  <circle key={id} cx={p.x} cy={p.y} r={r * 0.92} className="map-topic-ring" />
                );
              })}
            </g>
            {topicArrows && (
              <g className="map-topic-edges" data-emphasis={emphasis ? "" : undefined}>
                <path d={topicArrows.lines} className="map-line" />
                <path d={topicArrows.heads} className="map-head" />
              </g>
            )}
            {dots && (
              <g className="map-dots">
                {(Object.keys(dots.groups) as Status[]).map((s) => (
                  <g key={s} className={`map-dot-${s}`}>
                    <path d={dots.groups[s]} />
                    <path d={dots.dim[s]} className="map-dot-dim" />
                  </g>
                ))}
              </g>
            )}
          </>
        )}
        {conceptEdges && (
          <g className="map-concept-edges" data-emphasis={emphasis ? "" : undefined}>
            <path d={conceptEdges.cross} className="map-cross" />
            <path d={conceptEdges.lines} className="map-line" />
            <path d={conceptEdges.heads} className="map-head" />
            <path d={conceptEdges.hotCross} className="map-cross map-hot" />
            <path d={conceptEdges.hotLines} className="map-line map-hot" />
            <path d={conceptEdges.hotHeads} className="map-head map-hot" />
            {inkPaths.map((p) => (
              <path
                key={`${inkTargets?.key}-${p.id}`}
                d={p.d}
                pathLength={1}
                className="map-line map-ink-line"
              />
            ))}
          </g>
        )}
      </svg>
    </ViewportPortal>
  );
});
