#!/usr/bin/env node
// Computes map positions for every subject, topic and concept (BUILD_SPEC.md F2) and writes
// src/data/layout.json. Runs at build time only: the app never computes layout itself.
//
// Steps:
//   1. Inside each subject (relative coordinates): size each topic cluster by its concept count,
//      start topics on a spiral in learning order, then pack them with a force simulation that
//      pulls topics with prerequisite links next to each other.
//   2. Lay concepts on an arc around their topic center in learning order, then run a seeded force
//      simulation: collision by node size, a strong pull to the topic center, weak links along
//      prerequisite edges inside the subject, and a hard boundary so topics never mix.
//   3. Wrap each subject in a smooth organic outline (a contour of a density field around its
//      bubbles), falling back to a rounded hull if the contour is not a single clean shape.
//   4. Place subject regions on the neighborhood sketch from F2 and push them apart until no two
//      regions overlap.
//   5. Write { regions, topics, positions, bounds } with rounded numbers, one entry per line.
//
// The simulations use fixed seeds, so the same syllabus always gives the same layout. The file
// stores a hash of the syllabus structure: if it has not changed, the step is skipped (use
// --force to recompute). Editing content text never moves the map.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { forceSimulation, forceCollide, forceX, forceY, forceLink } from "d3-force";
import { polygonHull, polygonContains, polygonArea } from "d3-polygon";
import { line, curveCatmullRomClosed } from "d3-shape";
import { contours } from "d3-contour";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SYLLABUS_PATH = join(ROOT, "src", "data", "syllabus.generated.json");
const OUT_PATH = join(ROOT, "src", "data", "layout.json");

export const LAYOUT_VERSION = 2;

// Sizes at zoom 1 (BUILD_SPEC.md F2): bubble diameters 36 / 28 / 22 px.
export const BUBBLE_RADIUS = { must: 18, important: 14, advanced: 11 };
// Collision footprint leaves room for the label under each bubble.
const FOOTPRINT = { must: 48, important: 45, advanced: 41 };
const TOPIC_DENSITY = 0.6; // share of a topic circle covered by concept footprints
const TOPIC_GAP = 44; // space between neighbouring topic clusters
const REGION_GAP = 110; // minimum space between two subject regions
const SKETCH_UNIT = 150; // px per sketch grid unit before regions are pushed apart
const LABEL_MARGIN = 90; // room for region labels when computing the bounds

// Neighborhood sketch from F2 (column, row). Related subjects sit next to each other.
//           lang ── oop ── lld
//             \               \
//    eng       DSA (largest,   os ── conc ── arch
//             /   center)  \    |
//    math ── prob            \  cn ── sysd
//      |       |              \  |      |
//   puzzles  markets    apt    dbms ── sql
//                    career
const SKETCH = {
  lang: [8, 0],
  oop: [15, -0.4],
  lld: [22, 0.2],
  eng: [0, 4],
  dsa: [11, 5],
  os: [24, 3.6],
  conc: [30.5, 3.2],
  arch: [36.5, 3.6],
  math: [0.5, 9.2],
  prob: [7.5, 10.4],
  cn: [24, 8.4],
  sysd: [31, 8.8],
  puzzles: [0, 14],
  markets: [7, 15],
  apt: [15, 13.4],
  dbms: [23, 13.6],
  sql: [30, 14],
  career: [16, 17.4],
};

/** Deterministic pseudo-random numbers (LCG), so every build gives the same layout. */
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
  return h;
}

const round1 = (n) => Math.round(n * 10) / 10;

/** Hash of everything that affects the layout (ids, order, importance, prerequisites). */
export function structureHash(syllabus) {
  const shape = {
    v: LAYOUT_VERSION,
    subjects: syllabus.subjects.map((s) => [s.id, s.order]),
    topics: syllabus.topics.map((t) => [t.id, t.order, t.prereqTopics]),
    concepts: syllabus.concepts.map((c) => [c.id, c.importance, c.order, c.prereqs]),
  };
  return createHash("sha256").update(JSON.stringify(shape)).digest("hex").slice(0, 16);
}

function runSimulation(nodes, forces, ticks, seed, afterTick) {
  const sim = forceSimulation(nodes).randomSource(seededRandom(seed)).stop();
  for (const [name, force] of Object.entries(forces)) sim.force(name, force);
  for (let i = 0; i < ticks; i++) {
    sim.tick();
    afterTick?.();
  }
  return nodes;
}

function topicClusterRadius(concepts) {
  const area = concepts.reduce((sum, c) => sum + Math.PI * FOOTPRINT[c.importance] ** 2, 0);
  return Math.max(Math.sqrt(area / TOPIC_DENSITY / Math.PI), FOOTPRINT.must + 10);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distanceToRing(px, py, ring) {
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[(i + 1) % ring.length];
    best = Math.min(best, distanceToSegment(px, py, ax, ay, bx, by));
  }
  return best;
}

/** Resamples a closed ring to points roughly `step` px apart (keeps curves smooth and files small). */
function resampleRing(ring, step) {
  const pts =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  let perimeter = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    perimeter += Math.hypot(bx - ax, by - ay);
  }
  const count = Math.max(12, Math.round(perimeter / step));
  const spacing = perimeter / count;
  const out = [];
  let carried = 0;
  for (let i = 0; i < pts.length && out.length < count; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    const seg = Math.hypot(bx - ax, by - ay);
    let d = carried === 0 && out.length === 0 ? 0 : spacing - carried;
    while (d <= seg && out.length < count) {
      const t = seg === 0 ? 0 : d / seg;
      out.push([ax + t * (bx - ax), ay + t * (by - ay)]);
      d += spacing;
    }
    carried = seg - (d - spacing);
  }
  return out;
}

/** Smooth organic outline around the bubbles: a contour of a summed density field. */
function blobOutline(nodes) {
  const KERNEL = 165;
  const CELL = 12;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  }
  minX -= KERNEL + 2 * CELL;
  minY -= KERNEL + 2 * CELL;
  maxX += KERNEL + 2 * CELL;
  maxY += KERNEL + 2 * CELL;
  const w = Math.ceil((maxX - minX) / CELL) + 1;
  const h = Math.ceil((maxY - minY) / CELL) + 1;
  const field = new Float64Array(w * h);
  for (const n of nodes) {
    const gx = (n.x - minX) / CELL;
    const gy = (n.y - minY) / CELL;
    const rCells = KERNEL / CELL;
    for (
      let j = Math.max(0, Math.floor(gy - rCells));
      j <= Math.min(h - 1, Math.ceil(gy + rCells));
      j++
    ) {
      for (
        let i = Math.max(0, Math.floor(gx - rCells));
        i <= Math.min(w - 1, Math.ceil(gx + rCells));
        i++
      ) {
        const d = Math.hypot((i - gx) * CELL, (j - gy) * CELL) / KERNEL;
        if (d < 1) field[j * w + i] += (1 - d * d) ** 2;
      }
    }
  }
  for (const threshold of [1.2, 1.0, 0.85, 0.72, 0.6, 0.5, 0.42, 0.34, 0.27, 0.2, 0.14]) {
    const [shape] = contours().size([w, h]).thresholds([threshold])(field);
    const rings = shape.coordinates.map((poly) =>
      poly[0].map(([x, y]) => [minX + x * CELL, minY + y * CELL]),
    );
    if (rings.length !== 1) continue; // not one connected region yet: lower the threshold
    const ring = resampleRing(rings[0], 34);
    const clear = nodes.every(
      (n) =>
        polygonContains(ring, [n.x, n.y]) &&
        distanceToRing(n.x, n.y, ring) >= BUBBLE_RADIUS[n.importance] + 22,
    );
    if (clear) return ring;
  }
  return null;
}

/** Fallback outline: a padded convex hull with rounded corners. */
function roundedHull(nodes) {
  const pts = [];
  for (const n of nodes) {
    const pad = BUBBLE_RADIUS[n.importance] + 46;
    for (let k = 0; k < 16; k++) {
      const a = (2 * Math.PI * k) / 16;
      pts.push([n.x + pad * Math.cos(a), n.y + pad * Math.sin(a)]);
    }
  }
  return resampleRing(polygonHull(pts), 34);
}

/** Lays out one subject around (0, 0). */
function layoutSubject(subject, topics, conceptsByTopic, conceptTopic, seed) {
  const topicIds = new Set(topics.map((t) => t.id));

  // 1. Topic clusters: spiral start in learning order, then packing with prerequisite attraction.
  const golden = Math.PI * (3 - Math.sqrt(5));
  const topicNodes = topics.map((t, i) => {
    const r = topicClusterRadius(conceptsByTopic.get(t.id));
    const d = i === 0 ? 0 : 170 * Math.sqrt(i);
    return { id: t.id, r, x: d * Math.cos(i * golden), y: d * Math.sin(i * golden) };
  });
  const weights = new Map();
  const addWeight = (a, b, w) => {
    if (a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    weights.set(key, (weights.get(key) ?? 0) + w);
  };
  for (const t of topics)
    for (const p of t.prereqTopics) if (topicIds.has(p)) addWeight(p, t.id, 2);
  for (const t of topics) {
    for (const c of conceptsByTopic.get(t.id)) {
      for (const p of c.prereqs) {
        const pt = conceptTopic.get(p);
        if (topicIds.has(pt)) addWeight(pt, t.id, 1);
      }
    }
  }
  const topicLinks = [...weights].map(([key, w]) => {
    const [source, target] = key.split("|");
    return { source, target, w };
  });
  runSimulation(
    topicNodes,
    {
      collide: forceCollide((n) => n.r + TOPIC_GAP / 2)
        .strength(1)
        .iterations(4),
      link: forceLink(topicLinks)
        .id((n) => n.id)
        .distance((l) => l.source.r + l.target.r + TOPIC_GAP)
        .strength((l) => Math.min(0.5, 0.08 * l.w)),
      x: forceX(0).strength(0.04),
      y: forceY(0).strength(0.04),
    },
    600,
    seed,
  );
  const topicPos = new Map(topicNodes.map((n) => [n.id, n]));

  // 2. Concepts on an arc around their topic center, in learning order.
  const conceptNodes = [];
  for (const t of topics) {
    const center = topicPos.get(t.id);
    const list = conceptsByTopic.get(t.id);
    const inner = list.length <= 7 ? list.length : Math.min(6, Math.ceil(list.length / 2.2));
    list.forEach((c, i) => {
      const onInner = i < inner;
      const count = onInner ? inner : list.length - inner;
      const k = onInner ? i : i - inner;
      const ring = list.length <= 7 ? 0.5 : onInner ? 0.36 : 0.72;
      const angle = -Math.PI * 0.75 + (2 * Math.PI * k) / Math.max(count, 1);
      const rr = list.length === 1 ? 0 : center.r * ring;
      conceptNodes.push({
        id: c.id,
        topicId: t.id,
        importance: c.importance,
        tx: center.x,
        ty: center.y,
        maxR: Math.max(0, center.r - FOOTPRINT[c.importance] * 0.55),
        x: center.x + rr * Math.cos(angle),
        y: center.y + rr * Math.sin(angle),
      });
    });
  }
  const inSubject = new Set(conceptNodes.map((n) => n.id));
  const links = [];
  for (const t of topics) {
    for (const c of conceptsByTopic.get(t.id)) {
      for (const p of c.prereqs) if (inSubject.has(p)) links.push({ source: p, target: c.id });
    }
  }
  // Keep each concept inside its own topic circle so neighbouring topics never mix.
  const contain = () => {
    for (const n of conceptNodes) {
      const dx = n.x - n.tx;
      const dy = n.y - n.ty;
      const d = Math.hypot(dx, dy);
      if (d > n.maxR && d > 0) {
        n.x = n.tx + (dx / d) * n.maxR;
        n.y = n.ty + (dy / d) * n.maxR;
      }
    }
  };
  runSimulation(
    conceptNodes,
    {
      collide: forceCollide((n) => FOOTPRINT[n.importance])
        .strength(0.9)
        .iterations(3),
      x: forceX((n) => n.tx).strength(0.12),
      y: forceY((n) => n.ty).strength(0.12),
      link: forceLink(links)
        .id((n) => n.id)
        .distance(100)
        .strength((l) => (l.source.topicId === l.target.topicId ? 0.06 : 0.004)),
    },
    500,
    seed + 1,
    contain,
  );

  // 3. Topic bubbles sit at the centroid of their concepts.
  const topicsOut = {};
  for (const t of topics) {
    const members = conceptNodes.filter((n) => n.topicId === t.id);
    const cx = members.reduce((s, n) => s + n.x, 0) / members.length;
    const cy = members.reduce((s, n) => s + n.y, 0) / members.length;
    const r = Math.max(
      ...members.map((n) => Math.hypot(n.x - cx, n.y - cy) + BUBBLE_RADIUS[n.importance]),
    );
    topicsOut[t.id] = { x: cx, y: cy, r };
  }

  // 4. Outline.
  let ring = blobOutline(conceptNodes);
  const organic = ring !== null;
  if (!ring) ring = roundedHull(conceptNodes);
  const area = Math.abs(polygonArea(ring));
  const cx = conceptNodes.reduce((s, n) => s + n.x, 0) / conceptNodes.length;
  const cy = conceptNodes.reduce((s, n) => s + n.y, 0) / conceptNodes.length;
  const radius = Math.max(...ring.map(([x, y]) => Math.hypot(x - cx, y - cy)));
  return {
    subjectId: subject.id,
    conceptNodes,
    topicsOut,
    ring,
    center: [cx, cy],
    radius,
    organic,
    area,
  };
}

function placeSubjects(layouts) {
  const nodes = layouts.map((l) => {
    const [sx, sy] = SKETCH[l.subjectId] ?? [0, 0];
    return {
      id: l.subjectId,
      r: l.radius,
      ax: sx * SKETCH_UNIT,
      ay: sy * SKETCH_UNIT,
      x: sx * SKETCH_UNIT,
      y: sy * SKETCH_UNIT,
    };
  });
  runSimulation(
    nodes,
    {
      collide: forceCollide((n) => n.r + REGION_GAP / 2)
        .strength(1)
        .iterations(6),
      x: forceX((n) => n.ax).strength(0.04),
      y: forceY((n) => n.ay).strength(0.04),
    },
    1200,
    7,
  );
  return new Map(nodes.map((n) => [n.id, n]));
}

function smoothPath(points) {
  return line().digits(1).curve(curveCatmullRomClosed.alpha(0.5))(points);
}

/** Throws if two subject outlines overlap or a bubble lies inside another subject's region. */
function assertNoOverlap(rings, pointsBySubject) {
  const ids = Object.keys(rings);
  for (let i = 0; i < ids.length; i++) {
    for (let j = 0; j < ids.length; j++) {
      if (i === j) continue;
      const a = rings[ids[i]];
      const b = rings[ids[j]];
      if (a.some((p) => polygonContains(b, p)))
        throw new Error(`Regions ${ids[i]} and ${ids[j]} overlap`);
      if (pointsBySubject[ids[i]].some((p) => polygonContains(b, p))) {
        throw new Error(`A ${ids[i]} bubble lies inside the ${ids[j]} region`);
      }
    }
  }
}

export function buildLayout(syllabus) {
  const conceptsByTopic = new Map(syllabus.topics.map((t) => [t.id, []]));
  const conceptTopic = new Map();
  for (const c of syllabus.concepts) {
    conceptsByTopic.get(c.topicId).push(c);
    conceptTopic.set(c.id, c.topicId);
  }
  for (const list of conceptsByTopic.values()) list.sort((a, b) => a.order - b.order);

  const layouts = syllabus.subjects.map((s) =>
    layoutSubject(
      s,
      syllabus.topics.filter((t) => t.subjectId === s.id).sort((a, b) => a.order - b.order),
      conceptsByTopic,
      conceptTopic,
      hashString(s.id),
    ),
  );
  const placed = placeSubjects(layouts);

  const positions = {};
  const regions = {};
  const topics = {};
  const rings = {};
  const pointsBySubject = {};
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const l of layouts) {
    const p = placed.get(l.subjectId);
    const dx = p.x - l.center[0];
    const dy = p.y - l.center[1];
    for (const n of l.conceptNodes) positions[n.id] = { x: round1(n.x + dx), y: round1(n.y + dy) };
    for (const [id, t] of Object.entries(l.topicsOut)) {
      positions[id] = { x: round1(t.x + dx), y: round1(t.y + dy) };
      topics[id] = { r: round1(t.r) };
    }
    positions[l.subjectId] = { x: round1(p.x), y: round1(p.y) };
    const ring = l.ring.map(([x, y]) => [round1(x + dx), round1(y + dy)]);
    rings[l.subjectId] = ring;
    pointsBySubject[l.subjectId] = l.conceptNodes.map((n) => [n.x + dx, n.y + dy]);
    const top = Math.min(...ring.map((pt) => pt[1]));
    regions[l.subjectId] = {
      cx: round1(p.x),
      cy: round1(p.y),
      r: round1(l.radius),
      top: round1(top),
      area: Math.round(l.area),
      organic: l.organic,
      path: smoothPath(ring),
    };
    for (const [x, y] of ring) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  assertNoOverlap(rings, pointsBySubject);

  return {
    formatVersion: LAYOUT_VERSION,
    inputHash: structureHash(syllabus),
    bounds: {
      minX: round1(minX - LABEL_MARGIN),
      minY: round1(minY - LABEL_MARGIN),
      maxX: round1(maxX + LABEL_MARGIN),
      maxY: round1(maxY + LABEL_MARGIN),
    },
    sizes: { bubbleRadius: BUBBLE_RADIUS },
    regions,
    topics,
    positions,
  };
}

/** One entry per line, so git diffs stay readable. */
function serialize(layout) {
  const block = (obj) =>
    `{\n${Object.entries(obj)
      .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
      .join(",\n")}\n }`;
  return `{
 "formatVersion": ${layout.formatVersion},
 "inputHash": ${JSON.stringify(layout.inputHash)},
 "bounds": ${JSON.stringify(layout.bounds)},
 "sizes": ${JSON.stringify(layout.sizes)},
 "regions": ${block(layout.regions)},
 "topics": ${block(layout.topics)},
 "positions": ${block(layout.positions)}
}
`;
}

function main() {
  const force = process.argv.includes("--force");
  if (!existsSync(SYLLABUS_PATH)) {
    console.error(
      "✗ src/data/syllabus.generated.json is missing. Run `npm run build:syllabus` first.",
    );
    process.exit(1);
  }
  const syllabus = JSON.parse(readFileSync(SYLLABUS_PATH, "utf8"));
  const hash = structureHash(syllabus);
  if (!force && existsSync(OUT_PATH)) {
    try {
      const existing = JSON.parse(readFileSync(OUT_PATH, "utf8"));
      if (existing.inputHash === hash && existing.formatVersion === LAYOUT_VERSION) {
        console.log(`✓ Layout is up to date (${relative(ROOT, OUT_PATH)}, structure ${hash}).`);
        return;
      }
    } catch {
      /* recompute */
    }
  }
  const started = Date.now();
  const layout = buildLayout(syllabus);
  writeFileSync(OUT_PATH, serialize(layout));
  const { bounds, regions } = layout;
  const fallback = Object.entries(regions)
    .filter(([, r]) => !r.organic)
    .map(([id]) => id);
  console.log(
    `✓ Layout: ${Object.keys(layout.positions).length} nodes in ${Math.round(bounds.maxX - bounds.minX)} × ${Math.round(
      bounds.maxY - bounds.minY,
    )} px, no overlapping regions (${Date.now() - started} ms). Wrote ${relative(ROOT, OUT_PATH)}.`,
  );
  if (fallback.length) console.log(`  Rounded-hull outline used for: ${fallback.join(", ")}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
