// The minimap (F2): the whole map in a corner, regions and status-colored dots, with the visible
// area outlined. Click or drag in it to move the view there.
import { useReactFlow, useStore, type ReactFlowState } from "@xyflow/react";
import { useMemo, useRef, type CSSProperties } from "react";
import { layout } from "@/data/layout";
import { subjects } from "@/data/syllabus";
import type { Status } from "@/lib/types";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import type { MapModel } from "./useMapModel";

const WIDTH = 176;
const { minX, minY, maxX, maxY } = layout.bounds;
const SCALE = WIDTH / (maxX - minX);
const HEIGHT = Math.round((maxY - minY) * SCALE);

const viewSelector = (s: ReactFlowState) => ({
  x: s.transform[0],
  y: s.transform[1],
  zoom: s.transform[2],
  width: s.width,
  height: s.height,
});

export function Minimap({ model }: { model: MapModel }) {
  const flow = useReactFlow();
  const view = useStore(
    viewSelector,
    (a, b) =>
      a.x === b.x &&
      a.y === b.y &&
      a.zoom === b.zoom &&
      a.width === b.width &&
      a.height === b.height,
  );
  const states = useConceptStateStore((s) => s.states);
  const ref = useRef<SVGSVGElement>(null);

  const dots = useMemo(() => {
    const r = 1.6 / SCALE;
    const out: Record<Status, string> = { not_started: "", learning: "", strong: "", fading: "" };
    for (const c of model.concepts) {
      const p = model.positions.get(c.id);
      if (!p) continue;
      const s = states[c.id]?.status ?? "not_started";
      out[s] += `M${p.x - r},${p.y}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
    }
    return out;
  }, [model.concepts, model.positions, states]);

  const box = {
    x: -view.x / view.zoom,
    y: -view.y / view.zoom,
    w: view.width / view.zoom,
    h: view.height / view.zoom,
  };

  const moveTo = (clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = minX + ((clientX - rect.left) / rect.width) * (maxX - minX);
    const y = minY + ((clientY - rect.top) / rect.height) * (maxY - minY);
    void flow.setCenter(x, y, { zoom: flow.getZoom() });
  };

  return (
    <div className="map-minimap" aria-hidden="true">
      <svg
        ref={ref}
        width={WIDTH}
        height={HEIGHT}
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          moveTo(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons & 1) moveTo(e.clientX, e.clientY);
        }}
      >
        {subjects.map((s) => (
          <path
            key={s.id}
            d={layout.regions[s.id]!.path}
            className="map-region"
            data-level="far"
            data-off={!model.subjectIds.includes(s.id) || undefined}
            style={{ "--h": s.regionHue } as CSSProperties}
          />
        ))}
        {(Object.keys(dots) as Status[]).map((s) => (
          <path key={s} d={dots[s]} className={`map-mini-dot map-mini-${s}`} />
        ))}
        <rect
          x={box.x}
          y={box.y}
          width={Math.max(0, box.w)}
          height={Math.max(0, box.h)}
          className="map-mini-view"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
