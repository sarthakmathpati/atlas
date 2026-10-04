// Keep your place (F32, part 4): when the owner comes back after 10 minutes or more away (the app
// closed or the tab in the background), a "Where you left off" card shows the last page, the
// plan item and its step. The last page is kept in localStorage (this browser only) and
// refreshed every 30 seconds while the tab is in view and when it goes out of view.
import { create } from "zustand";

const STORAGE_KEY = "atlas.place";
export const AWAY_MS = 10 * 60_000;
const BEAT_MS = 30_000;

export interface PlaceDetail {
  /** The plan item being worked on. */
  item: string;
  /** Its step not ticked yet, when it has steps. */
  step?: { index: number; count: number; text: string };
}

export interface Place extends Partial<PlaceDetail> {
  /** The route, such as "/problems/lc-69?mode=resolve". */
  path: string;
  /** The page's title, such as "69. Sqrt(x)". */
  title: string;
  /** When the owner was last here (ms since epoch). */
  at: number;
}

let describe: (() => PlaceDetail | undefined) | null = null;

/** The ADHD layer says which plan item and step the owner is on (read when the place is noted). */
export function setPlaceDetail(fn: (() => PlaceDetail | undefined) | null): void {
  describe = fn;
}

interface PlaceState {
  /** The card: where the owner was before being away. */
  back: { place: Place; awayMs: number } | null;
}

export const usePlaceStore = create<PlaceState>(() => ({ back: null }));

function read(): Place | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const p = raw ? (JSON.parse(raw) as Place) : null;
    return p && typeof p.path === "string" && typeof p.at === "number" ? p : null;
  } catch {
    return null;
  }
}

function write(place: Place): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(place));
  } catch {
    /* only a convenience */
  }
}

/** The page the owner is on now, with the plan item and step. */
function here(now: number): Place {
  const path = window.location.hash.replace(/^#/, "") || "/today";
  const title = document.title.replace(/\s+–\s+[^–]+$/, "").trim();
  let detail: PlaceDetail | undefined;
  try {
    detail = describe?.();
  } catch {
    detail = undefined;
  }
  return { path, title, at: now, ...detail };
}

/** Remembers the page (on a heartbeat while in view, and when the tab goes out of view). */
export function notePlace(now = Date.now()): void {
  write(here(now));
}

/** On load or when the tab comes back: shows the card after 10 minutes or more away. */
export function checkReturn(now = Date.now()): void {
  const place = read();
  if (place && now - place.at >= AWAY_MS) {
    usePlaceStore.setState({ back: { place, awayMs: now - place.at } });
  }
  notePlace(now);
}

export function dismissPlace(): void {
  usePlaceStore.setState({ back: null });
}

let stop: (() => void) | null = null;

/** Starts keeping the place (once, from the ADHD layer). */
export function watchPlace(): () => void {
  if (stop) return stop;
  checkReturn();
  let beat: ReturnType<typeof setInterval> | null = null;
  const startBeat = () => {
    if (!beat) beat = setInterval(() => notePlace(), BEAT_MS);
  };
  const onVisibility = () => {
    if (document.hidden) {
      notePlace();
      if (beat) clearInterval(beat);
      beat = null;
    } else {
      checkReturn();
      startBeat();
    }
  };
  const onHide = () => notePlace();
  // A new page sets its title as it renders: note the place a moment later.
  let pending: ReturnType<typeof setTimeout> | null = null;
  const onRoute = () => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => notePlace(), 800);
  };
  if (!document.hidden) startBeat();
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onHide);
  window.addEventListener("hashchange", onRoute);
  onRoute();
  stop = () => {
    if (beat) clearInterval(beat);
    if (pending) clearTimeout(pending);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onHide);
    window.removeEventListener("hashchange", onRoute);
    stop = null;
  };
  return stop;
}
