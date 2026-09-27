// The Survey texture (BUILD_SPEC.md 12.10.6): contour lines from lib/art/contours drawn on a
// canvas behind a page head, an empty state or a break, plus the theme's map extras:
//   Day   spot heights at labelled peaks
//   Dusk  a dotted graticule every 72 px
//   Night up to 16 faint soundings (depth numbers)
// Labelled peaks keep their spot heights in every theme, since they carry numbers. Extras never
// go inside a quiet zone (where text sits). The canvas is decorative (aria-hidden), never
// animates, caps the pixel ratio at 2, and redraws when its size or the theme changes. Never
// put it behind reading text, code, drill prompts or flashcards.
import { useEffect, useRef } from "react";
import {
  contours,
  soundings,
  visibleSpotHeights,
  type ContourHill,
  type QuietZone,
} from "@/lib/art/contours";
import { cx } from "./cx";
import { useShownTheme } from "./hooks";

interface ContourCanvasProps {
  seed: number | string;
  /** Roughly how many lines span the background (default 12). */
  levels?: number;
  /** Grid cell in px (default 6). */
  cell?: number;
  hills?: ContourHill[];
  /**
   * More areas (fractions of the size) to keep clear. The text and icons next to the canvas (its
   * siblings) are always kept clear.
   */
  quietZones?: QuietZone[];
  /** "map": the theme's extras (default); "lines": contour lines only. */
  texture?: "map" | "lines";
  /** A CSS custom property for the lines (default --contour). */
  colorVar?: string;
  className?: string;
}

type Kind = "day" | "dusk" | "night";

/** Elements whose own box counts as content (icons, pictures, controls). */
const BOXED = new Set(["svg", "img", "button", "input", "select", "textarea"]);

/**
 * Where the words sit: the line boxes of every text in the canvas's siblings, and the boxes of
 * icons and controls, as quiet zones (fractions of the canvas) with a little margin. So spot
 * heights and soundings never land under text, whatever the layout.
 */
function contentZones(canvas: HTMLCanvasElement, width: number, height: number): QuietZone[] {
  const parent = canvas.parentElement;
  if (!parent) return [];
  const origin = canvas.getBoundingClientRect();
  const rects: DOMRect[] = [];
  const range = document.createRange();
  for (const child of Array.from(parent.children)) {
    if (child === canvas) continue;
    const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let node: Node | null = walker.currentNode; node; node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (!node.textContent?.trim()) continue;
        range.selectNodeContents(node);
        rects.push(...Array.from(range.getClientRects()));
      } else if (BOXED.has((node as Element).tagName.toLowerCase())) {
        rects.push((node as Element).getBoundingClientRect());
      }
    }
  }
  const marginX = 8;
  const marginY = 6;
  return rects
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({
      x: (r.left - origin.left - marginX) / width,
      y: (r.top - origin.top - marginY) / height,
      w: (r.width + 2 * marginX) / width,
      h: (r.height + 2 * marginY) / height,
    }));
}

const GRATICULE = 72;

function draw(
  canvas: HTMLCanvasElement,
  props: Required<Pick<ContourCanvasProps, "seed" | "levels" | "cell" | "texture" | "colorVar">> &
    Pick<ContourCanvasProps, "hills" | "quietZones">,
  kind: Kind,
): void {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width === 0 || height === 0) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const style = getComputedStyle(canvas);
  const line = style.getPropertyValue(props.colorVar).trim();
  if (!line) return;
  const zones = [...(props.quietZones ?? []), ...contentZones(canvas, width, height)];
  const result = contours({
    width,
    height,
    seed: props.seed,
    levels: props.levels,
    cell: props.cell,
    hills: props.hills,
  });

  ctx.strokeStyle = line;
  ctx.lineCap = "round";
  for (const level of result.levels) {
    ctx.lineWidth = level.major ? 1.35 : 0.75;
    ctx.beginPath();
    const s = level.segments;
    for (let i = 0; i < s.length; i += 4) {
      ctx.moveTo(s[i]!, s[i + 1]!);
      ctx.lineTo(s[i + 2]!, s[i + 3]!);
    }
    ctx.stroke();
  }
  if (props.texture === "lines") return;

  const font = style.getPropertyValue("--font-sans").trim() || "sans-serif";
  if (kind === "dusk") {
    ctx.save();
    ctx.setLineDash([2, 6]);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let x = GRATICULE * 0.8; x < width; x += GRATICULE) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = GRATICULE * 0.66; y < height; y += GRATICULE) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.restore();
  }
  if (kind === "night") {
    ctx.save();
    ctx.fillStyle = style.getPropertyValue("--text-faint").trim();
    ctx.globalAlpha = 0.55;
    ctx.font = `400 10.5px ${font}`;
    // About one sounding per 9,000 px² (a 1200 × 240 head gets the full 16).
    const count = Math.min(16, Math.round((width * height) / 9000));
    for (const mark of soundings(width, height, props.seed, zones, count)) {
      ctx.fillText(mark.text, mark.x, mark.y);
    }
    ctx.restore();
  }
  const spots = visibleSpotHeights(result, zones);
  if (spots.length) {
    ctx.fillStyle = style.getPropertyValue("--contour-label").trim();
    ctx.font = `600 11px ${font}`;
    for (const spot of spots) ctx.fillText(`▲ ${spot.text}`, spot.x - 6, spot.y + 4);
  }
}

export function ContourCanvas({
  seed,
  levels = 12,
  cell = 6,
  hills,
  quietZones,
  texture = "map",
  colorVar = "--contour",
  className,
}: ContourCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const shown = useShownTheme();
  const hillsKey = JSON.stringify(hills ?? null);
  const zonesKey = JSON.stringify(quietZones ?? null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    // Inside a theme preview (the design kit), the preview's theme decides the extras.
    const preview = canvas.closest("[data-theme-preview]")?.getAttribute("data-theme-preview");
    const kind: Kind =
      preview === "dusk" || preview === "night" || preview === "day" ? preview : shown;
    const options = {
      seed,
      levels,
      cell,
      texture,
      colorVar,
      hills: JSON.parse(hillsKey) as ContourHill[] | undefined,
      quietZones: JSON.parse(zonesKey) as QuietZone[] | undefined,
    };
    let frame = 0;
    const redraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => draw(canvas, options, kind));
    };
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    redraw();
    // Canvas text needs the bundled fonts; draw again once they're in.
    void document.fonts?.ready.then(redraw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [seed, levels, cell, texture, colorVar, hillsKey, zonesKey, shown]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cx("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}
