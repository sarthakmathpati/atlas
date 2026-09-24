// The map's bubbles (F2): subject regions at far zoom, topic clusters in the middle, concept
// bubbles near. Each is memoized and subscribes only to its own status, label room and emphasis,
// so a status change re-renders one bubble. Labels keep a fixed size on screen (they are scaled
// by --map-inv, set on the canvas as the zoom changes); bubbles scale with the map.
import type { Node, NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";
import { memo, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { cx } from "@/components/ui/cx";
import { prefersReducedMotion } from "@/components/ui/hooks";
import { STATUS_LABEL } from "@/components/ui/labels";
import { SegmentedBar } from "@/components/ui/Progress";
import { SubjectIcon } from "@/components/ui/SubjectIcon";
import { subjectById, topicById } from "@/data/syllabus";
import type { StatusCounts } from "@/lib/map/summary";
import { strongShare, totalOf } from "@/lib/map/summary";
import { isDue } from "@/lib/srs/intervals";
import type { Status } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { useConceptStateStore, useConceptStatus } from "@/stores/conceptStateStore";
import { takeInk } from "@/stores/inkStore";
import { longPressHandlers, useMapActions } from "./actions";
import { useEmphasis, useMapView } from "./viewStore";

// ----- subjects (far zoom) --------------------------------------------------------------------

export interface SubjectNodeData extends Record<string, unknown> {
  subjectId: string;
  labelIndex: number;
  counts: StatusCounts;
  match: boolean;
}

export type SubjectNodeType = Node<SubjectNodeData, "subject">;

const RING = 34;

function Ring({ share }: { share: number }) {
  const r = (RING - 4) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={RING} height={RING} className="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        fill="var(--surface)"
        stroke="var(--rule-strong)"
        strokeWidth={3}
      />
      {share > 0 && (
        <circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          fill="none"
          stroke="var(--status-strong-stroke)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${Math.max(1.5, c * share)} ${c}`}
        />
      )}
    </svg>
  );
}

export const SubjectNode = memo(function SubjectNode({ data }: NodeProps<SubjectNodeType>) {
  const subject = subjectById.get(data.subjectId)!;
  const actions = useMapActions();
  const showName = useMapView((s) => data.labelIndex <= s.subjectStep);
  const emphasis = useEmphasis(data.subjectId);
  const total = totalOf(data.counts);
  const share = strongShare(data.counts);
  const fading = data.counts.fading;
  const label = `${subject.name}: ${Math.round(share * 100)}% strong of ${total} concepts${
    fading ? `, ${fading} fading` : ""
  }. Open this subject.`;
  return (
    <div
      className="map-node map-subject-node"
      data-dim={!data.match || emphasis === "off" || undefined}
    >
      <button
        type="button"
        className="map-card map-subject"
        aria-label={label}
        onClick={() => actions.flyToSubject(data.subjectId)}
      >
        <span
          className="relative grid shrink-0 place-items-center"
          style={{ width: RING, height: RING }}
        >
          <Ring share={share} />
          <span className="relative text-muted">
            <SubjectIcon name={subject.icon} size={16} />
          </span>
          {fading > 0 && (
            <span className="map-badge-fading" aria-hidden="true">
              {fading}
            </span>
          )}
        </span>
        {showName && <span className="map-subject-name">{subject.shortName}</span>}
      </button>
    </div>
  );
});

// ----- topics (middle zoom) -------------------------------------------------------------------

export interface TopicNodeData extends Record<string, unknown> {
  topicId: string;
  labelIndex: number;
  counts: StatusCounts;
  match: boolean;
}

export type TopicNodeType = Node<TopicNodeData, "topic">;

export const TopicNode = memo(function TopicNode({ data }: NodeProps<TopicNodeType>) {
  const topic = topicById.get(data.topicId)!;
  const actions = useMapActions();
  const showName = useMapView((s) => data.labelIndex <= s.topicStep);
  const emphasis = useEmphasis(data.topicId);
  const press = useMemo(
    () =>
      longPressHandlers((at, el) => actions.openMenu({ kind: "topic", id: data.topicId }, at, el)),
    [actions, data.topicId],
  );
  const total = totalOf(data.counts);
  const open = () => {
    if (press.consumeLongPress()) return;
    actions.flyToTopic(data.topicId);
  };
  return (
    <div
      className="map-node map-topic"
      data-dim={!data.match || emphasis === "off" || undefined}
      onClick={open}
      onContextMenu={(e) => {
        e.preventDefault();
        actions.openMenu(
          { kind: "topic", id: data.topicId },
          { x: e.clientX, y: e.clientY },
          e.currentTarget,
        );
      }}
      onPointerDown={press.onPointerDown}
      onPointerMove={press.onPointerMove}
      onPointerUp={press.onPointerUp}
      onPointerCancel={press.onPointerCancel}
    >
      <button
        type="button"
        className={cx("map-card map-topic-card", !showName && "map-topic-card-compact")}
        aria-label={`${topic.name}: ${data.counts.strong} of ${total} concepts strong. Zoom in to this topic.`}
        onClick={(e) => {
          e.stopPropagation();
          open();
        }}
      >
        {showName && <span className="map-topic-name">{topic.name}</span>}
        <SegmentedBar counts={data.counts} height={4} className="map-topic-bar" />
      </button>
    </div>
  );
});

// ----- concepts (near zoom) -------------------------------------------------------------------

export interface ConceptNodeData extends Record<string, unknown> {
  conceptId: string;
  name: string;
  r: number;
  labelIndex: number;
  match: boolean;
  otherLanguage: boolean;
  custom: boolean;
  pattern: boolean;
  problems: number;
}

export type ConceptNodeType = Node<ConceptNodeData, "concept">;

function useConceptDue(conceptId: string): boolean {
  const today = useToday();
  return useConceptStateStore((s) => isDue(s.states[conceptId]?.srs.dueAt, today));
}

/** The status glyph at bubble size (section 12.3: color and shape). */
function Bubble({ status, r }: { status: Status; r: number }) {
  const d = 2 * r;
  const inner = r - 1.5;
  const disc = status === "fading" ? inner - 3.2 : inner;
  return (
    <svg
      width={d}
      height={d}
      viewBox={`${-r} ${-r} ${d} ${d}`}
      className="map-bubble"
      aria-hidden="true"
    >
      {status === "fading" && <circle r={r - 0.75} className="map-ring-dashed" />}
      <circle r={disc} className={`map-disc map-disc-${status}`} />
      {status === "learning" && (
        <path d={`M${-disc},0 A${disc},${disc} 0 0,0 ${disc},0 Z`} className="map-half" />
      )}
      {status === "strong" && <circle r={disc} className="map-ink" />}
      <circle r={disc} className={`map-outline map-outline-${status}`} />
      {status === "strong" && r >= 13 && (
        <path
          d={`M${-r * 0.36},${r * 0.02} l${r * 0.26},${r * 0.26} l${r * 0.48},${-r * 0.52}`}
          className="map-check"
        />
      )}
    </svg>
  );
}

export const ConceptNode = memo(function ConceptNode({ data }: NodeProps<ConceptNodeType>) {
  const id = data.conceptId;
  const status = useConceptStatus(id);
  const due = useConceptDue(id);
  const actions = useMapActions();
  const selected = useMapView((s) => s.selected === id);
  const showLabel = useMapView(
    (s) => data.labelIndex <= s.conceptStep || s.selected === id || s.hovered === id,
  );
  const emphasis = useEmphasis(id);
  const pulseKey = useMapView((s) => (s.pulse?.id === id ? s.pulse.key : 0));
  const ref = useRef<HTMLDivElement>(null);
  const press = useMemo(
    () => longPressHandlers((at, el) => actions.openMenu({ kind: "concept", id }, at, el)),
    [actions, id],
  );

  // The ink moment: once per change to strong, while the bubble is on screen. If the change came
  // from a dialog on top of the map (flashcards, explain it back), it plays once that closes.
  useEffect(() => {
    const el = ref.current;
    if (status !== "strong" || !el || !takeInk(id) || prefersReducedMotion()) return;
    let done: ReturnType<typeof setTimeout> | undefined;
    const play = () => {
      el.dataset.ink = "";
      useMapView.setState({ inkEdges: { from: id, to: [], key: Date.now() } });
      done = setTimeout(() => delete el.dataset.ink, 800);
    };
    const covered = () => document.querySelector("dialog[open].atlas-modal") !== null;
    if (!covered()) {
      play();
      return () => clearTimeout(done);
    }
    const wait = setInterval(() => {
      if (covered()) return;
      clearInterval(wait);
      play();
    }, 150);
    return () => {
      clearInterval(wait);
      clearTimeout(done);
    };
  }, [status, id]);

  const label = `${data.name}, ${STATUS_LABEL[status].toLowerCase()}${due ? ", due for review" : ""}${
    data.pattern ? ", pattern" : ""
  }${data.custom ? ", your own concept" : ""}`;

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      className="map-node map-concept"
      data-selected={selected || undefined}
      data-dim={!data.match || emphasis === "off" || undefined}
      data-soft={emphasis === "soft" || undefined}
      data-faint={data.otherLanguage || undefined}
      data-emphasis={emphasis === "on" || undefined}
      style={{ "--r": data.r } as CSSProperties}
      onClick={() => {
        if (press.consumeLongPress()) return;
        actions.select(id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          actions.select(id);
        } else if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
          e.preventDefault();
          const box = ref.current?.getBoundingClientRect();
          if (box)
            actions.openMenu({ kind: "concept", id }, { x: box.right, y: box.bottom }, ref.current);
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        actions.openMenu({ kind: "concept", id }, { x: e.clientX, y: e.clientY }, ref.current);
      }}
      onPointerDown={press.onPointerDown}
      onPointerMove={press.onPointerMove}
      onPointerUp={press.onPointerUp}
      onPointerCancel={press.onPointerCancel}
      onMouseEnter={() => actions.hover(id, ref.current)}
      onMouseLeave={() => actions.hover(null, null)}
    >
      <Bubble status={status} r={data.r} />
      {pulseKey > 0 && <span key={pulseKey} className="map-pulse" aria-hidden="true" />}
      {data.pattern && (
        <span className="map-mark-p" aria-hidden="true">
          P
        </span>
      )}
      {due && (
        <span className="map-mark-due" aria-hidden="true">
          <Clock strokeWidth={2.5} />
        </span>
      )}
      {data.problems > 0 && (
        <span
          className="map-mark-problems"
          data-many={data.problems >= 3 || undefined}
          aria-hidden="true"
        />
      )}
      {data.custom && <span className="map-mark-yours" aria-hidden="true" />}
      {showLabel && <span className="map-label">{data.name}</span>}
    </div>
  );
});

export const NODE_TYPES = { subject: SubjectNode, topic: TopicNode, concept: ConceptNode };
