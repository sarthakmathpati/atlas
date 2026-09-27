// The architecture sketch as a diagram (F26): React Flow draws the boxes where the layered layout
// (lib/designs/sketch.ts, dagre) put them, and each arrow along dagre's route around the other
// boxes. Read-only: pan by dragging, pinch or use the buttons to zoom; the page still scrolls.
import "@xyflow/react/dist/base.css";
import {
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  Archive,
  Database,
  Globe,
  Layers,
  Maximize,
  Minus,
  Monitor,
  Plus,
  Server,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import {
  layoutSketch,
  routePath,
  type Direction,
  type NodeKind,
  type ParsedSketch,
  type PlacedEdge,
} from "@/lib/designs/sketch";

const KIND_ICON: Record<NodeKind, LucideIcon> = {
  client: Monitor,
  service: Server,
  db: Database,
  cache: Zap,
  queue: Layers,
  storage: Archive,
  external: Globe,
};

const KIND_LABEL: Record<NodeKind, string> = {
  client: "Client",
  service: "Service",
  db: "Database",
  cache: "Cache",
  queue: "Queue",
  storage: "Storage",
  external: "External",
};

type BoxData = { label: string; kind: NodeKind; width: number; height: number };
type BoxNode = Node<BoxData, "box">;
type RouteData = { edge: PlacedEdge };
type RouteEdge = Edge<RouteData, "route">;

const HIDDEN_HANDLE = "!pointer-events-none !opacity-0 !border-0 !bg-transparent";

const Box = memo(function Box({ data }: NodeProps<BoxNode>) {
  const Icon = KIND_ICON[data.kind];
  return (
    <div
      style={{ width: data.width, height: data.height }}
      title={`${data.label} (${KIND_LABEL[data.kind].toLowerCase()})`}
      className={cx(
        "flex items-center gap-2 border bg-surface px-3 text-sm font-medium text-text",
        data.kind === "db" || data.kind === "storage"
          ? "rounded-[14px] border-rule-strong"
          : data.kind === "client" || data.kind === "external"
            ? "rounded-full border-dashed border-rule-strong"
            : "rounded-control border-rule-strong",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={HIDDEN_HANDLE}
        isConnectable={false}
      />
      <Icon size={15} aria-hidden="true" className="shrink-0 text-accent" />
      <span className="line-clamp-2 leading-tight">{data.label}</span>
      <Handle
        type="source"
        position={Position.Right}
        className={HIDDEN_HANDLE}
        isConnectable={false}
      />
    </div>
  );
});

function Route({ id, data, markerEnd, markerStart, style }: EdgeProps<RouteEdge>) {
  const edge = data!.edge;
  const path = routePath(edge.points);
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} markerStart={markerStart} style={style} />
      {edge.label && edge.labelAt && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute max-w-40 truncate rounded bg-canvas px-1.5 text-xs text-muted"
            style={{
              transform: `translate(-50%, -50%) translate(${edge.labelAt.x}px, ${edge.labelAt.y}px)`,
            }}
          >
            {edge.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const NODE_TYPES = { box: Box };
const EDGE_TYPES = { route: Route };

function Controls({ fitKey }: { fitKey: string }) {
  const flow = useReactFlow();
  // Refit whenever the drawing or the box changes (after React Flow has measured the box).
  const boxWidth = useStore((st) => st.width);
  const boxHeight = useStore((st) => st.height);
  useEffect(() => {
    const id = requestAnimationFrame(
      () => void flow.fitView({ padding: 0.08, maxZoom: MAX_ZOOM_FIT }),
    );
    return () => cancelAnimationFrame(id);
  }, [fitKey, flow, boxWidth, boxHeight]);
  return (
    <Panel position="bottom-right" className="flex gap-1">
      <IconButton
        icon={Plus}
        label="Zoom in"
        size="sm"
        variant="secondary"
        onClick={() => void flow.zoomIn({ duration: 150 })}
      />
      <IconButton
        icon={Minus}
        label="Zoom out"
        size="sm"
        variant="secondary"
        onClick={() => void flow.zoomOut({ duration: 150 })}
      />
      <IconButton
        icon={Maximize}
        label="Fit the diagram"
        size="sm"
        variant="secondary"
        onClick={() => void flow.fitView({ padding: 0.08, maxZoom: MAX_ZOOM_FIT, duration: 200 })}
      />
    </Panel>
  );
}

export interface SketchViewProps {
  sketch: Pick<ParsedSketch, "nodes" | "edges">;
  direction: Direction;
  height?: number;
  className?: string;
}

const MAX_ZOOM_FIT = 1.1;

export default function SketchView({
  sketch,
  direction,
  height = 360,
  className,
}: SketchViewProps) {
  const layout = useMemo(() => layoutSketch(sketch, direction), [sketch, direction]);
  // The box grows or shrinks to the drawing: as tall as the diagram needs at the zoom that fits
  // its width, between 220 px and the given height.
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fitHeight = (() => {
    if (!width || !layout.width) return height;
    const zoom = Math.min(MAX_ZOOM_FIT, (width - 24) / layout.width);
    return Math.round(Math.min(height, Math.max(220, layout.height * zoom + 56)));
  })();
  const nodes = useMemo<BoxNode[]>(
    () =>
      layout.nodes.map((n) => ({
        id: n.id,
        type: "box",
        position: { x: n.x, y: n.y },
        data: { label: n.label, kind: n.kind, width: n.width, height: n.height },
        width: n.width,
        height: n.height,
        draggable: false,
        selectable: false,
      })),
    [layout],
  );
  const edges = useMemo<RouteEdge[]>(
    () =>
      layout.edges.map((e) => {
        const marker = {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: "var(--text-muted)",
        };
        return {
          id: e.id,
          source: e.from,
          target: e.to,
          type: "route",
          data: { edge: e },
          markerEnd: e.heads === "none" ? undefined : marker,
          markerStart: e.heads === "both" ? marker : undefined,
          style: {
            stroke: "var(--text-muted)",
            strokeWidth: 1.5,
            strokeDasharray: e.style === "dashed" ? "5 4" : undefined,
          },
          selectable: false,
          focusable: false,
        };
      }),
    [layout],
  );
  const fitKey = `${direction}|${fitHeight}|${layout.nodes.map((n) => `${n.id}@${Math.round(n.x)},${Math.round(n.y)}`).join(";")}`;
  const summary = `${layout.nodes.length} ${layout.nodes.length === 1 ? "box" : "boxes"} and ${layout.edges.length} ${layout.edges.length === 1 ? "arrow" : "arrows"}: ${layout.edges
    .map((e) => {
      const from = layout.nodes.find((n) => n.id === e.from)?.label ?? e.from;
      const to = layout.nodes.find((n) => n.id === e.to)?.label ?? e.to;
      return `${from} to ${to}${e.label ? ` (${e.label})` : ""}`;
    })
    .join(", ")}.`;

  return (
    <div
      ref={box}
      className={cx(
        "sketch-view overflow-hidden rounded-panel border border-rule bg-canvas",
        className,
      )}
      style={{ height: fitHeight }}
    >
      <ReactFlowProvider>
        <ReactFlow<BoxNode, RouteEdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          nodeOrigin={[0.5, 0.5]}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          zoomOnScroll={false}
          panOnScroll={false}
          preventScrolling={false}
          zoomOnDoubleClick={false}
          minZoom={0.2}
          maxZoom={2}
          disableKeyboardA11y
          proOptions={{ hideAttribution: true }}
          aria-label={`Architecture sketch with ${summary}`}
        >
          <Controls fitKey={fitKey} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
