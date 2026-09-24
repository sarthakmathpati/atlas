// The zoomable knowledge map (F2), drawn with React Flow. Three semantic zoom levels:
//   far (below 0.3)     subject regions with a progress ring and a fading badge;
//   middle (0.3 to 0.7) topic clusters with a status bar, topic prerequisite arrows;
//   near (0.7 and up)   concept bubbles with labels, prerequisite and connection lines.
// Positions come from the precomputed layout (plus dragged positions); nothing is laid out at
// runtime. Only visible bubbles are rendered, each subscribing to its own status.
import "@xyflow/react/dist/base.css";
import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  useReactFlow,
  useStore,
  type Node,
  type NodeChange,
  type ReactFlowState,
  type Viewport,
} from "@xyflow/react";
import { Maximize, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "@/components/ui/Button";
import { useMediaQuery, prefersReducedMotion } from "@/components/ui/hooks";
import { STATUS_LABEL } from "@/components/ui/labels";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { layout } from "@/data/layout";
import { dependentsOf } from "@/data/syllabus";
import { isCustomConceptId } from "@/lib/concepts/custom";
import { problemsForConcept } from "@/lib/problems/catalog";
import { useConceptStatus } from "@/stores/conceptStateStore";
import { findConcept } from "@/stores/customConceptStore";
import { moveNode, type Point } from "@/stores/mapStore";
import { useProblemStore } from "@/stores/problemStore";
import { MapActionsContext, type MapActions, type MenuTarget } from "./actions";
import { MapLayers } from "./layers";
import { Minimap } from "./Minimap";
import {
  NODE_TYPES,
  type ConceptNodeData,
  type SubjectNodeData,
  type TopicNodeData,
} from "./nodes";
import { BUBBLE_RADIUS, type MapModel } from "./useMapModel";
import { MAX_ZOOM, MIN_ZOOM, NEAR_ZOOM, setViewZoom, useMapView } from "./viewStore";

export interface FlyRequest {
  kind: "concept" | "topic" | "subject" | "fit" | "ids";
  id?: string;
  ids?: readonly string[];
  /** A new key flies again, even to the same place. */
  key: string;
  pulse?: boolean;
  instant?: boolean;
}

interface MapCanvasProps {
  model: MapModel;
  selected: string | null;
  onSelect: (conceptId: string) => void;
  onMenu: (target: MenuTarget, at: { x: number; y: number }, from: HTMLElement | null) => void;
  fly: FlyRequest | null;
  /** Focus mode: dim everything but the selected concept's neighborhood (1 or 2 steps). */
  hops: 0 | 1 | 2;
  /** A path being shown (F25): only its concepts stay at full strength. */
  pathIds: ReadonlySet<string> | null;
}

/** Where the map was when the owner left it (this visit only). */
let savedViewport: Viewport | null = null;

type AnyNode =
  | Node<SubjectNodeData, "subject">
  | Node<TopicNodeData, "topic">
  | Node<ConceptNodeData, "concept">;

function sameData(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
}

/** Neighbors of a concept within `hops` steps (prerequisites, dependents, connections). */
function neighborhood(id: string, hops: number): Set<string> {
  const out = new Set([id]);
  let frontier = [id];
  for (let i = 0; i < hops; i++) {
    const next: string[] = [];
    for (const n of frontier) {
      const c = findConcept(n);
      const around = [
        ...(c?.prereqs ?? []),
        ...(dependentsOf.get(n) ?? []),
        ...(c?.related.map((r) => r.to) ?? []),
      ];
      for (const m of around) {
        if (out.has(m)) continue;
        out.add(m);
        next.push(m);
      }
    }
    frontier = next;
  }
  return out;
}

/** Adds the topics and subjects of the given concepts, so they stay bright at other zooms. */
function withParents(ids: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    out.add(id);
    const c = findConcept(id);
    if (c) {
      out.add(c.topicId);
      out.add(c.subjectId);
    }
  }
  return out;
}

const sizeSelector = (s: ReactFlowState) => ({ width: s.width, height: s.height });
const zoomSelector = (s: ReactFlowState) => s.transform[2];

/** A drafting grid whose spacing adapts to the zoom, so it never turns into a dense mesh. */
function Grid() {
  const zoom = useStore(zoomSelector);
  let gap = 48;
  while (gap * zoom < 26) gap *= 2;
  while (gap * zoom > 60 && gap > 12) gap /= 2;
  return (
    <Background
      variant={BackgroundVariant.Lines}
      gap={gap}
      lineWidth={1}
      color="var(--grid-line)"
      bgColor="var(--canvas)"
    />
  );
}

function Tooltip({ target }: { target: { id: string; rect: DOMRect } | null }) {
  // Shown after a short rest on the bubble, so moving across the map doesn't flash tooltips.
  const [shownFor, setShownFor] = useState<string | null>(null);
  useEffect(() => {
    if (!target) return;
    const t = setTimeout(() => setShownFor(target.id), 280);
    return () => clearTimeout(t);
  }, [target]);
  const concept = target && shownFor === target.id ? findConcept(target.id) : undefined;
  const conceptStatus = useConceptStatus(target?.id ?? "");
  if (!target || !concept) return null;
  const left = target.rect.left + target.rect.width / 2;
  const top = target.rect.top - 8;
  return (
    <div className="map-tooltip" role="tooltip" style={{ left, top }}>
      <p className="font-medium text-text">{concept.name}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
        <StatusGlyph status={conceptStatus} size={12} />
        {STATUS_LABEL[conceptStatus]}
      </p>
      {concept.scope !== concept.name && (
        <p className="mt-1 line-clamp-2 text-xs text-muted">{concept.scope}</p>
      )}
    </div>
  );
}

/**
 * Node objects from the last render, reused when nothing about a node changed, so React Flow and
 * the memoized bubbles skip it. There is one map on screen at a time.
 */
const nodeCache = new Map<string, AnyNode>();

export function MapCanvas({
  model,
  selected,
  onSelect,
  onMenu,
  fly,
  hops,
  pathIds,
}: MapCanvasProps) {
  const flow = useReactFlow();
  const level = useMapView((s) => s.level);
  const hovered = useMapView((s) => s.hovered);
  const { width, height } = useStore(
    sizeSelector,
    (a, b) => a.width === b.width && a.height === b.height,
  );
  const problemStates = useProblemStore((s) => s.states);
  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragged, setDragged] = useState<ReadonlyMap<string, Point>>(new Map());
  const [ready, setReady] = useState(false);
  const [tip, setTip] = useState<{ id: string; rect: DOMRect } | null>(null);

  // ----- nodes for the current zoom level ----------------------------------------------------
  const problemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of model.concepts)
      counts.set(c.id, problemsForConcept(c.id, problemStates).length);
    return counts;
  }, [model.concepts, problemStates]);

  const nodes = useMemo(() => {
    const built: AnyNode[] = [];
    if (level === "far") {
      for (const id of model.subjectIds) {
        const r = layout.regions[id]!;
        built.push({
          id,
          type: "subject",
          position: { x: r.cx, y: r.cy },
          width: 2 * r.r * 0.8,
          height: 2 * r.r * 0.8,
          draggable: false,
          selectable: false,
          data: {
            subjectId: id,
            labelIndex: model.subjectLabels.get(id) ?? 99,
            counts: model.subjectCounts.get(id)!,
            match: model.subjectMatch.get(id) ?? true,
          },
        });
      }
    } else if (level === "middle") {
      for (const id of model.topicIds) {
        const p = layout.positions[id]!;
        const r = layout.topics[id]?.r ?? 80;
        built.push({
          id,
          type: "topic",
          position: p,
          width: 2 * r,
          height: 2 * r,
          draggable: false,
          selectable: false,
          data: {
            topicId: id,
            labelIndex: model.topicLabels.get(id) ?? 99,
            counts: model.topicCounts.get(id)!,
            match: model.topicMatch.get(id) ?? true,
          },
        });
      }
    } else {
      for (const c of model.concepts) {
        const p = dragged.get(c.id) ?? model.positions.get(c.id);
        const f = model.facts.get(c.id);
        if (!p || !f) continue;
        const r = BUBBLE_RADIUS[c.importance];
        built.push({
          id: c.id,
          type: "concept",
          position: p,
          width: 2 * r,
          height: 2 * r,
          draggable: finePointer,
          selectable: false,
          data: {
            conceptId: c.id,
            name: c.name,
            r,
            labelIndex: model.conceptLabels.get(c.id) ?? 99,
            match: f.match,
            otherLanguage: f.otherLanguage,
            custom: isCustomConceptId(c.id),
            pattern: c.isPattern,
            problems: problemCounts.get(c.id) ?? 0,
          },
        });
      }
    }
    // Reuse unchanged node objects, so React Flow and the memoized bubbles skip them.
    const next = new Map<string, AnyNode>();
    const out = built.map((n) => {
      const prev = nodeCache.get(n.id);
      const same =
        prev &&
        prev.type === n.type &&
        prev.position.x === n.position.x &&
        prev.position.y === n.position.y &&
        prev.width === n.width &&
        prev.draggable === n.draggable &&
        sameData(prev.data, n.data);
      const node = same ? prev : n;
      next.set(n.id, node);
      return node;
    });
    nodeCache.clear();
    for (const [id, node] of next) nodeCache.set(id, node);
    return out;
  }, [level, model, dragged, finePointer, problemCounts]);

  /** The latest position each drag reported (ahead of the re-render that shows it). */
  const lastDrag = useRef(new Map<string, Point>());
  const onNodesChange = useCallback((changes: NodeChange<AnyNode>[]) => {
    const moves = changes.filter(
      (c): c is Extract<NodeChange<AnyNode>, { type: "position" }> =>
        c.type === "position" && Boolean(c.position),
    );
    if (moves.length === 0) return;
    for (const m of moves) lastDrag.current.set(m.id, m.position!);
    setDragged((prev) => {
      const next = new Map(prev);
      for (const m of moves) next.set(m.id, m.position!);
      return next;
    });
  }, []);

  const onNodeDragStop = useCallback((_: unknown, node: AnyNode) => {
    if (node.type !== "concept") return;
    moveNode(node.id, lastDrag.current.get(node.id) ?? node.position);
    lastDrag.current.delete(node.id);
    setDragged((prev) => {
      const next = new Map(prev);
      next.delete(node.id);
      return next;
    });
  }, []);

  // ----- zoom, labels and the saved view -----------------------------------------------------
  const lastLevel = useRef(level);
  const applyZoom = useCallback((zoom: number) => {
    const el = wrapperRef.current;
    el?.style.setProperty("--map-inv", String(1 / zoom));
    setViewZoom(zoom);
    // Level changes cross-fade (about 150 ms): bubbles that appear now fade in.
    const next = useMapView.getState().level;
    if (el && next !== lastLevel.current) {
      lastLevel.current = next;
      el.dataset.fading = "";
      window.setTimeout(() => delete el.dataset.fading, 220);
    }
  }, []);

  const onInit = useCallback(() => setReady(true), []);

  // The first view once the canvas has its size: where the owner left it, or the whole map
  // (unless a link asks for somewhere in particular).
  const placed = useRef(false);
  useEffect(() => {
    if (!ready || width === 0 || height === 0 || placed.current) return;
    placed.current = true;
    if (savedViewport) {
      void flow.setViewport(savedViewport);
      applyZoom(savedViewport.zoom);
    } else if (!fly) {
      const { minX, minY, maxX, maxY } = layout.bounds;
      void flow
        .fitBounds({ x: minX, y: minY, width: maxX - minX, height: maxY - minY }, { padding: 0.04 })
        .then(() => applyZoom(flow.getZoom()));
    }
  }, [ready, width, height, flow, applyZoom, fly]);

  useEffect(
    () => () => useMapView.setState({ hovered: null, emphasis: null, selected: null, pulse: null }),
    [],
  );

  // ----- selection, hover and emphasis -------------------------------------------------------
  useEffect(() => {
    useMapView.setState({ selected });
  }, [selected]);

  useEffect(() => {
    let emphasis: Set<string> | null = null;
    let emphasisKind: "hover" | "focus" | "path" | null = null;
    if (pathIds) {
      emphasis = withParents(pathIds);
      emphasisKind = "path";
    } else if (hops > 0 && selected) {
      emphasis = withParents(neighborhood(selected, hops));
      emphasisKind = "focus";
    } else if (hovered && level === "near") {
      emphasis = neighborhood(hovered, 1);
      if (selected) emphasis.add(selected);
      emphasisKind = "hover";
    }
    useMapView.setState({ emphasis, emphasisKind });
  }, [pathIds, hops, selected, hovered, level]);

  // Keep the selected bubble in view when the panel opens or the window narrows.
  useEffect(() => {
    if (!ready || !selected || width === 0) return;
    const p = model.positions.get(selected);
    if (!p) return;
    const { x, y, zoom } = flow.getViewport();
    const sx = p.x * zoom + x;
    const sy = p.y * zoom + y;
    const margin = 48;
    if (sx < margin || sy < margin || sx > width - margin || sy > height - margin) {
      void flow.setCenter(p.x, p.y, { zoom, duration: prefersReducedMotion() ? 0 : 300 });
    }
    // Only when the selection or the canvas size changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, width, height, ready]);

  // ----- flying somewhere (search, links, clicks on regions and topics) ----------------------
  const flyTo = useCallback(
    (request: FlyRequest) => {
      const duration = request.instant || prefersReducedMotion() ? 0 : 400;
      const w = Math.max(1, width);
      const h = Math.max(1, height);
      const clamp = (z: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, z));
      if (request.kind === "concept" && request.id) {
        const p = model.positions.get(request.id);
        if (!p) return;
        const zoom = clamp(Math.max(flow.getZoom(), 1.2), NEAR_ZOOM + 0.05, 2);
        void flow.setCenter(p.x, p.y, { zoom, duration });
        if (request.pulse) {
          setTimeout(
            () => useMapView.setState({ pulse: { id: request.id!, key: Date.now() } }),
            duration,
          );
        }
      } else if (request.kind === "topic" && request.id) {
        const p = layout.positions[request.id];
        const r = layout.topics[request.id]?.r ?? 100;
        if (!p) return;
        const zoom = clamp(Math.min(w, h) / (2 * r * 1.3), NEAR_ZOOM + 0.05, 1.6);
        void flow.setCenter(p.x, p.y, { zoom, duration });
      } else if (request.kind === "subject" && request.id) {
        const region = layout.regions[request.id];
        if (!region) return;
        const zoom = clamp(Math.min(w, h) / (2 * region.r * 1.05), 0.32, 0.66);
        void flow.setCenter(region.cx, region.cy, { zoom, duration });
      } else if (request.kind === "ids" && request.ids?.length) {
        const pts = request.ids.map((id) => model.positions.get(id)).filter((p): p is Point => !!p);
        if (pts.length === 0) return;
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const minX = Math.min(...xs) - 60;
        const minY = Math.min(...ys) - 60;
        const bw = Math.max(...xs) - minX + 60;
        const bh = Math.max(...ys) - minY + 90;
        const zoom = clamp(Math.min(w / bw, h / bh), 0.2, 1.4);
        void flow.setCenter(minX + bw / 2, minY + bh / 2, { zoom, duration });
      } else {
        const { minX, minY, maxX, maxY } = layout.bounds;
        void flow.fitBounds(
          { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
          { padding: 0.04, duration },
        );
      }
    },
    [flow, model.positions, width, height],
  );

  const flownKey = useRef<string | null>(null);
  useEffect(() => {
    if (!fly || !ready || width === 0 || height === 0 || flownKey.current === fly.key) return;
    flownKey.current = fly.key;
    // The first view flies without animation.
    flyTo(placed.current ? fly : { ...fly, instant: true });
    placed.current = true;
  }, [fly, ready, width, height, flyTo]);

  // ----- actions for the bubbles ------------------------------------------------------------
  const actions = useMemo<MapActions>(
    () => ({
      select: onSelect,
      openMenu: (target, at, from) => {
        setTip(null);
        onMenu(target, at, from);
      },
      flyToTopic: (id) => flyTo({ kind: "topic", id, key: `t-${id}-${Date.now()}` }),
      flyToSubject: (id) => flyTo({ kind: "subject", id, key: `s-${id}-${Date.now()}` }),
      hover: (id, el) => {
        if (!finePointer) return;
        useMapView.setState({ hovered: id });
        setTip(id && el ? { id, rect: el.getBoundingClientRect() } : null);
      },
    }),
    [onSelect, onMenu, flyTo, finePointer],
  );

  const empty = model.concepts.length === 0;

  return (
    <MapActionsContext.Provider value={actions}>
      <div ref={wrapperRef} className="map-canvas h-full w-full" data-level={level}>
        <ReactFlow<AnyNode>
          nodes={nodes}
          edges={[]}
          nodeTypes={NODE_TYPES}
          nodeOrigin={[0.5, 0.5]}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onInit={onInit}
          onMove={(_, vp) => applyZoom(vp.zoom)}
          onMoveStart={() => setTip(null)}
          onMoveEnd={(_, vp) => {
            if (placed.current) savedViewport = vp;
          }}
          onPaneClick={() => setTip(null)}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          nodeDragThreshold={4}
          elementsSelectable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          disableKeyboardA11y
          onlyRenderVisibleElements
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
          aria-label="Knowledge map"
        >
          <Grid />
          <MapLayers model={model} dragged={dragged} pathIds={pathIds} />
          <Panel position="bottom-right" className="map-controls">
            <IconButton
              icon={Plus}
              label="Zoom in"
              variant="secondary"
              onClick={() => void flow.zoomIn({ duration: 200 })}
            />
            <IconButton
              icon={Minus}
              label="Zoom out"
              variant="secondary"
              onClick={() => void flow.zoomOut({ duration: 200 })}
            />
            <IconButton
              icon={Maximize}
              label="Show the whole map"
              variant="secondary"
              onClick={() => flyTo({ kind: "fit", key: `fit-${Date.now()}` })}
            />
          </Panel>
          {!pathIds && (
            <Panel position="bottom-left" className="max-md:hidden">
              <Minimap model={model} />
            </Panel>
          )}
        </ReactFlow>
        {empty && (
          <div className="map-empty" role="status">
            Nothing matches these filters. Clear a filter to see more of the map.
          </div>
        )}
        <Tooltip target={tip} />
      </div>
    </MapActionsContext.Provider>
  );
}
