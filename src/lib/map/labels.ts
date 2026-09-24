// Map labels never overlap (F2 "hide lower-importance labels when crowded"). Labels keep a fixed
// size on screen while bubbles scale with the map, so the more you zoom in, the more labels fit.
// For each label this finds the smallest zoom (from a list of steps) from which it can always be
// shown without covering a more important label or another bubble. Greedy by priority; the
// result is monotonic (once shown, a label stays shown as you zoom in). Pure and deterministic.

export interface LabelItem {
  id: string;
  /** Bubble center and radius in map units. */
  x: number;
  y: number;
  r: number;
  /** Label size on screen, in px. */
  w: number;
  h: number;
  /** Higher shows first (must-know before important before advanced). */
  priority: number;
}

export interface LabelOptions {
  /** Labels sit below their bubble ("below") or on its center ("center", for topic cards). */
  anchor: "below" | "center";
  /** Screen px between the bubble and a label below it. */
  gap?: number;
  /** Screen px kept clear around each label. */
  padding?: number;
  /** Label size multiplier: above 1 thins labels out, below 1 packs them tighter. */
  scale?: number;
}

type Box = [number, number, number, number]; // minX, minY, maxX, maxY

const CELL = 256;

class Grid {
  private cells = new Map<string, Box[]>();
  private *keys(b: Box) {
    for (let cx = Math.floor(b[0] / CELL); cx <= Math.floor(b[2] / CELL); cx++)
      for (let cy = Math.floor(b[1] / CELL); cy <= Math.floor(b[3] / CELL); cy++)
        yield `${cx},${cy}`;
  }
  add(b: Box) {
    for (const k of this.keys(b)) {
      const list = this.cells.get(k);
      if (list) list.push(b);
      else this.cells.set(k, [b]);
    }
  }
  hits(b: Box, ignore?: Box) {
    for (const k of this.keys(b)) {
      for (const o of this.cells.get(k) ?? []) {
        if (o === ignore) continue;
        if (b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]) return true;
      }
    }
    return false;
  }
}

/**
 * For each item, the index into `zooms` from which its label shows (zooms ascending).
 * `zooms.length` means "never" (it doesn't fit even at the last step).
 */
export function labelThresholds(
  items: readonly LabelItem[],
  zooms: readonly number[],
  options: LabelOptions,
): Map<string, number> {
  const gap = options.gap ?? 3;
  const pad = options.padding ?? 2;
  const scale = options.scale ?? 1;
  const ordered = [...items].sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : 1));
  const placedAt: Set<string>[] = [];

  for (const z of zooms) {
    const bubbles = new Grid();
    const bubbleBox = new Map<string, Box>();
    for (const it of items) {
      const b: Box = [it.x - it.r, it.y - it.r, it.x + it.r, it.y + it.r];
      bubbleBox.set(it.id, b);
      bubbles.add(b);
    }
    const labels = new Grid();
    const placed = new Set<string>();
    for (const it of ordered) {
      const halfW = ((it.w * scale) / 2 + pad) / z;
      const h = (it.h * scale + 2 * pad) / z;
      const top = options.anchor === "below" ? it.y + it.r + gap / z : it.y - h / 2;
      const box: Box = [it.x - halfW, top, it.x + halfW, top + h];
      const own = bubbleBox.get(it.id);
      if (labels.hits(box) || bubbles.hits(box, own)) continue;
      labels.add(box);
      placed.add(it.id);
    }
    placedAt.push(placed);
  }

  const out = new Map<string, number>();
  for (const it of items) {
    let index = zooms.length;
    for (let k = zooms.length - 1; k >= 0; k--) {
      if (placedAt[k]!.has(it.id)) index = k;
      else break;
    }
    out.set(it.id, index);
  }
  return out;
}

/** Approximate rendered size of a label: condensed 12 px text, wrapped to at most two lines. */
export function measureLabel(
  text: string,
  { charWidth = 5.9, maxWidth = 116, lineHeight = 14, maxLines = 2 } = {},
): { w: number; h: number } {
  const width = text.length * charWidth;
  const lines = Math.min(maxLines, Math.max(1, Math.ceil(width / maxWidth)));
  return { w: Math.min(width, maxWidth), h: lines * lineHeight };
}
