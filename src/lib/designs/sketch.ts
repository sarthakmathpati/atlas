// The architecture sketch (BUILD_SPEC.md F26): plain lines such as `Client -> API Gateway : HTTPS`
// become a box-and-arrow diagram with an automatic layered layout (@dagrejs/dagre). The parser
// is forgiving where it can be (names are matched without regard to case or extra spaces) and
// says exactly which line is wrong, and why, where it can't. Lines that parse are still drawn.
//
// Syntax, one statement per line:
//   Client -> API Gateway : HTTPS      an arrow, with an optional label after a colon
//   A -> B -> C                        a chain of arrows
//   A <- B, A <-> B                    arrows the other way, or both ways
//   Worker --> Queue : publish         a dashed arrow (async: events, messages)
//   Cache -- Service                   a plain line, no arrowhead
//   Orders DB [db]                     a box on its own, with an optional kind
//   # a comment, // also a comment
// Kinds: client, service, db, cache, queue, storage, external. Without one, the name decides
// (…DB, Postgres → db; Redis, cache → cache; Kafka, queue → queue; S3, blob → storage; …).
import dagre from "@dagrejs/dagre";

export type NodeKind = "client" | "service" | "db" | "cache" | "queue" | "storage" | "external";
export const NODE_KINDS: readonly NodeKind[] = [
  "client",
  "service",
  "db",
  "cache",
  "queue",
  "storage",
  "external",
];

export type ArrowStyle = "solid" | "dashed";
export type ArrowHeads = "end" | "both" | "none";

export interface SketchNode {
  /** Normalized name (lowercase, single spaces): the key used by edges. */
  id: string;
  /** The name as first written. */
  label: string;
  kind: NodeKind;
  /** First line (1-based) that mentions it. */
  line: number;
}

export interface SketchEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  style: ArrowStyle;
  heads: ArrowHeads;
  line: number;
}

export interface SketchError {
  line: number;
  message: string;
}

export interface ParsedSketch {
  nodes: SketchNode[];
  edges: SketchEdge[];
  errors: SketchError[];
}

export const MAX_NAME = 40;
export const MAX_NODES = 40;

/** Arrow tokens, longest first so "<->" wins over "<-" and "-->" over "--". */
const ARROWS: { token: string; style: ArrowStyle; heads: ArrowHeads; reverse?: boolean }[] = [
  { token: "<->", style: "solid", heads: "both" },
  { token: "-->", style: "dashed", heads: "end" },
  { token: "<--", style: "dashed", heads: "end", reverse: true },
  { token: "->", style: "solid", heads: "end" },
  { token: "<-", style: "solid", heads: "end", reverse: true },
  { token: "--", style: "solid", heads: "none" },
];

/** Arrow-like text people type that Atlas doesn't draw, with what to use instead. */
const WRONG_ARROWS: { pattern: RegExp; hint: string }[] = [
  { pattern: /=>|==>/, hint: "->" },
  { pattern: /→/, hint: "->" },
  { pattern: /←/, hint: "<-" },
  { pattern: /↔|<=>/, hint: "<->" },
  { pattern: /\.\.>|~>/, hint: "-->" },
  { pattern: /(^|\s)>(\s|$)/, hint: "->" },
];

const KIND_WORDS: [NodeKind, RegExp][] = [
  [
    "db",
    /\b(db|database|postgres(ql)?|mysql|sql|cassandra|mongo(db)?|dynamo(db)?|sqlite|spanner|bigtable|hbase|oracle)\b/i,
  ],
  ["cache", /\b(cache|redis|memcached?)\b/i],
  ["queue", /\b(queue|kafka|sqs|rabbit(mq)?|pub\/?sub|stream|topic|event bus|message bus)\b/i],
  ["storage", /\b(s3|blob|object stor(e|age)|storage|bucket|file store|hdfs|disk)\b/i],
  [
    "client",
    /\b(client|user|users|browser|mobile|app client|web app|driver app|rider app|customer)\b/i,
  ],
  [
    "external",
    /\b(cdn|third[- ]party|payment gateway|stripe|email provider|sms provider|external)\b/i,
  ],
];

/** The kind a name suggests ("Orders DB" → db), or "service". */
export function inferKind(name: string): NodeKind {
  for (const [kind, re] of KIND_WORDS) if (re.test(name)) return kind;
  return "service";
}

export const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

interface NameRef {
  label: string;
  kind?: NodeKind;
}

/** Splits "A -> B -> C" into names and arrows; null parts mark an empty side. */
function splitArrows(body: string): { names: string[]; arrows: (typeof ARROWS)[number][] } {
  const names: string[] = [];
  const arrows: (typeof ARROWS)[number][] = [];
  let rest = body;
  for (;;) {
    let best: { at: number; arrow: (typeof ARROWS)[number] } | null = null;
    for (const arrow of ARROWS) {
      const at = rest.indexOf(arrow.token);
      if (
        at >= 0 &&
        (!best || at < best.at || (at === best.at && arrow.token.length > best.arrow.token.length))
      )
        best = { at, arrow };
    }
    if (!best) {
      names.push(rest);
      return { names, arrows };
    }
    names.push(rest.slice(0, best.at));
    arrows.push(best.arrow);
    rest = rest.slice(best.at + best.arrow.token.length);
  }
}

function readName(raw: string, line: number, errors: SketchError[]): NameRef | null {
  let text = raw.trim();
  let kind: NodeKind | undefined;
  const bracket = /\[([^\]]*)\]\s*$/.exec(text);
  if (bracket) {
    const k = bracket[1]!.trim().toLowerCase();
    text = text.slice(0, bracket.index).trim();
    if (!(NODE_KINDS as readonly string[]).includes(k)) {
      errors.push({
        line,
        message: `“[${bracket[1]}]” isn't a kind Atlas knows. Use one of: ${NODE_KINDS.join(", ")}.`,
      });
      return null;
    }
    kind = k as NodeKind;
  }
  if (!text) {
    if (bracket)
      errors.push({ line, message: "A kind needs a name before it, such as “Orders DB [db]”." });
    return null;
  }
  if (/[[\]]/.test(text)) {
    errors.push({
      line,
      message: "Put a kind in brackets at the end of a name, such as “Orders DB [db]”.",
    });
    return null;
  }
  if (text.length > MAX_NAME) {
    errors.push({
      line,
      message: `“${text.slice(0, 24)}…” is ${text.length} characters. Keep names under ${MAX_NAME} and put details in a label after a colon.`,
    });
    return null;
  }
  return { label: text.replace(/\s+/g, " "), kind };
}

/** Parses the sketch text. Every line either adds to the diagram or explains what's wrong. */
export function parseSketch(text: string): ParsedSketch {
  const nodes = new Map<string, SketchNode>();
  const edges: SketchEdge[] = [];
  const errors: SketchError[] = [];
  const seenEdges = new Set<string>();

  const addNode = (ref: NameRef, line: number): string => {
    const id = normalizeName(ref.label);
    const existing = nodes.get(id);
    if (existing) {
      if (ref.kind && existing.kind !== ref.kind) existing.kind = ref.kind;
      return id;
    }
    nodes.set(id, { id, label: ref.label, kind: ref.kind ?? inferKind(ref.label), line });
    return id;
  };

  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, i) => {
    const line = i + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return;

    // The label is everything after the first colon.
    const colon = trimmed.indexOf(":");
    const body = colon >= 0 ? trimmed.slice(0, colon) : trimmed;
    const label = colon >= 0 ? trimmed.slice(colon + 1).trim() : undefined;

    const wrong = WRONG_ARROWS.find((w) => w.pattern.test(body));
    const { names, arrows } = splitArrows(body);
    if (arrows.length === 0) {
      if (wrong) {
        errors.push({
          line,
          message: `Atlas doesn't know that arrow. Write it as “${wrong.hint}”, for example “Client ${wrong.hint} API Gateway”. Arrows: ->, <-, <->, --> (dashed) and -- (a plain line).`,
        });
        return;
      }
      if (label !== undefined) {
        errors.push({
          line,
          message: "A label needs an arrow before it, such as “Client -> API Gateway : HTTPS”.",
        });
        return;
      }
      const ref = readName(body, line, errors);
      if (ref) addNode(ref, line);
      return;
    }
    if (wrong) {
      errors.push({
        line,
        message: `Part of this line looks like an arrow Atlas doesn't know. Use “${wrong.hint}” instead.`,
      });
      return;
    }
    if (label !== undefined && !label) {
      errors.push({ line, message: "Nothing follows the colon. Add a label or remove the colon." });
      return;
    }
    const before = errors.length;
    const refs = names.map((n) => readName(n, line, errors));
    if (errors.length > before) return;
    const empty = refs.findIndex((r) => r === null);
    if (empty >= 0) {
      errors.push({
        line,
        message:
          empty === 0
            ? "An arrow needs a name before it, such as “Client -> API Gateway”."
            : empty === refs.length - 1
              ? "An arrow needs a name after it, such as “Client -> API Gateway”."
              : "Two arrows in a row need a name between them, such as “A -> B -> C”.",
      });
      return;
    }
    const ids = refs.map((r) => addNode(r!, line));
    arrows.forEach((arrow, k) => {
      let from = ids[k]!;
      let to = ids[k + 1]!;
      if (arrow.reverse) [from, to] = [to, from];
      if (from === to) {
        errors.push({
          line,
          message: `An arrow from “${nodes.get(from)!.label}” to itself can't be drawn. Describe it in a label on another arrow instead.`,
        });
        return;
      }
      const key = `${from}|${to}|${label ?? ""}|${arrow.style}|${arrow.heads}`;
      if (seenEdges.has(key)) return;
      seenEdges.add(key);
      const edge: SketchEdge = {
        id: `e${edges.length}`,
        from,
        to,
        style: arrow.style,
        heads: arrow.heads,
        line,
      };
      // A chain shares the label only on its last arrow ("A -> B -> C : HTTPS" labels B → C).
      if (label && k === arrows.length - 1) edge.label = label;
      edges.push(edge);
    });
  });

  if (nodes.size > MAX_NODES) {
    errors.push({
      line: 0,
      message: `The sketch has ${nodes.size} boxes; Atlas draws the first ${MAX_NODES}. Group smaller parts into one box.`,
    });
    const keep = new Set([...nodes.keys()].slice(0, MAX_NODES));
    return {
      nodes: [...nodes.values()].filter((n) => keep.has(n.id)),
      edges: edges.filter((e) => keep.has(e.from) && keep.has(e.to)),
      errors,
    };
  }
  return { nodes: [...nodes.values()], edges, errors };
}

// ----- layout ------------------------------------------------------------------------------------

export type Direction = "LR" | "TB";

export interface PlacedNode extends SketchNode {
  /** Center position. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedEdge extends SketchEdge {
  /** The route dagre found, from the source box's edge to the target's, around other boxes. */
  points: { x: number; y: number }[];
  /** Where the label goes (the middle of the route). */
  labelAt?: { x: number; y: number };
}

export interface SketchLayout {
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  width: number;
  height: number;
}

/** Box size from the label: about 7.4 px per character at 13 px, plus room for the icon. */
export function nodeSize(node: Pick<SketchNode, "label" | "kind">): {
  width: number;
  height: number;
} {
  // Long names wrap onto two lines rather than widening the box.
  const width = Math.min(168, Math.max(96, Math.round(node.label.length * 7.2 + 48)));
  return { width, height: node.kind === "db" || node.kind === "storage" ? 56 : 46 };
}

/** A layered layout (dagre): arrows flow left to right (or top to bottom), boxes never overlap. */
export function layoutSketch(
  sketch: Pick<ParsedSketch, "nodes" | "edges">,
  direction: Direction = "LR",
): SketchLayout {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  // Labels get ranks of their own in dagre, so keep ranks closer when there are labels.
  const labelled = sketch.edges.some((e) => e.label);
  g.setGraph({
    rankdir: direction,
    nodesep: 28,
    ranksep: labelled ? 26 : 56,
    edgesep: 14,
    marginx: 12,
    marginy: 12,
  });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of sketch.nodes) g.setNode(n.id, { ...nodeSize(n) });
  for (const e of sketch.edges) {
    g.setEdge(
      e.from,
      e.to,
      {
        // Labels take room between ranks.
        width: e.label ? Math.min(120, e.label.length * 6 + 10) : 0,
        height: e.label ? 18 : 0,
        labelpos: "c",
      },
      e.id,
    );
  }
  dagre.layout(g);
  const nodes = sketch.nodes.map((n) => {
    const p = g.node(n.id) as { x: number; y: number; width: number; height: number };
    return { ...n, x: p.x, y: p.y, width: p.width, height: p.height };
  });
  const edges = sketch.edges.map((e) => {
    const placed = g.edge({ v: e.from, w: e.to, name: e.id }) as {
      points?: { x: number; y: number }[];
      x?: number;
      y?: number;
    };
    const out: PlacedEdge = { ...e, points: placed?.points ?? [] };
    if (e.label && placed?.x !== undefined && placed.y !== undefined)
      out.labelAt = { x: placed.x, y: placed.y };
    return out;
  });
  const graph = g.graph() as { width?: number; height?: number };
  return { nodes, edges, width: graph.width ?? 0, height: graph.height ?? 0 };
}

/** A starting sketch for a design prompt's text box. */
export const SKETCH_EXAMPLE = `# One arrow per line. Labels go after a colon.
Client -> API Gateway : HTTPS
API Gateway -> URL Service
URL Service -> Cache
URL Service -> Links DB [db]
URL Service --> Analytics Queue : click events`;

/** An SVG path through the route's points, with softly rounded corners. */
export function routePath(points: readonly { x: number; y: number }[], radius = 10): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  if (rest.length === 0) return `M ${first!.x} ${first!.y}`;
  let d = `M ${first!.x} ${first!.y}`;
  for (let i = 0; i < rest.length; i++) {
    const p = rest[i]!;
    const next = rest[i + 1];
    if (!next) {
      d += ` L ${p.x} ${p.y}`;
      break;
    }
    const prev = i === 0 ? first! : rest[i - 1]!;
    const inLen = Math.hypot(p.x - prev.x, p.y - prev.y);
    const outLen = Math.hypot(next.x - p.x, next.y - p.y);
    const r = Math.min(radius, inLen / 2, outLen / 2);
    const a = {
      x: p.x - ((p.x - prev.x) / (inLen || 1)) * r,
      y: p.y - ((p.y - prev.y) / (inLen || 1)) * r,
    };
    const b = {
      x: p.x + ((next.x - p.x) / (outLen || 1)) * r,
      y: p.y + ((next.y - p.y) / (outLen || 1)) * r,
    };
    d += ` L ${a.x} ${a.y} Q ${p.x} ${p.y} ${b.x} ${b.y}`;
  }
  return d;
}

/**
 * The direction that shows the sketch largest in a box of the given size: a long chain reads
 * better left to right on a wide screen, a tall tree top to bottom on a phone.
 */
export function bestDirection(
  sketch: Pick<ParsedSketch, "nodes" | "edges">,
  box: { width: number; height: number },
): Direction {
  const fit = (d: Direction) => {
    const l = layoutSketch(sketch, d);
    return Math.min(box.width / Math.max(1, l.width), box.height / Math.max(1, l.height));
  };
  return fit("TB") > fit("LR") * 1.15 ? "TB" : "LR";
}
