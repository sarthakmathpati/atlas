// Breaks that work (F32, part 6): after 90 minutes of activity without a break, a gentle check-in,
// "Time for water and a stretch?", with "Take 5" (a break, with the break view) and "Not now".
// It shows at most once every 90 minutes, never while a focus block runs (the block's own break
// is coming), and only with ADHD mode's breaks part on. The stretch of activity is mirrored to
// localStorage, so a reload in the middle of a long session doesn't reset it.
import { create } from "zustand";
import {
  addActivity,
  afterBreak,
  checkInDue,
  emptyStretch,
  type ActivityStretch,
} from "@/lib/adhd/checkIn";
import { adhdPartOn } from "@/lib/adhd/prefs";
import { onActivityCounted } from "./activityStore";
import { blockActive, focusDurations, startBreak, useFocusTimerStore } from "./focusTimerStore";
import { useProfileStore } from "./profileStore";

const STORAGE_KEY = "atlas.activityStretch";
const SAVE_EVERY_MS = 30_000;

interface CheckInState {
  stretch: ActivityStretch;
  /** The check-in is showing. */
  due: boolean;
}

export const useCheckInStore = create<CheckInState>(() => ({
  stretch: emptyStretch(Date.now()),
  due: false,
}));

const breakMs = () => focusDurations().break;

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(useCheckInStore.getState().stretch));
  } catch {
    /* only a convenience */
  }
}

function restore(now: number): ActivityStretch {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as ActivityStretch) : null;
    if (saved && typeof saved.ms === "number" && typeof saved.lastAt === "number") {
      return {
        ms: Math.max(0, saved.ms),
        lastAt: saved.lastAt,
        shownAt: typeof saved.shownAt === "number" ? saved.shownAt : undefined,
      };
    }
  } catch {
    /* fall through */
  }
  return emptyStretch(now);
}

/** Counts activity toward the check-in; shows it when it's due. */
export function noteActivity(countedMs: number, now = Date.now()): void {
  const s = useCheckInStore.getState();
  let stretch = addActivity(s.stretch, countedMs, now, breakMs());
  let due = s.due;
  const on = adhdPartOn(useProfileStore.getState().profile?.prefs, "breaks");
  if (!due && on && !blockActive(useFocusTimerStore.getState()) && checkInDue(stretch, now, breakMs())) {
    due = true;
    stretch = { ...stretch, shownAt: now };
    useCheckInStore.setState({ stretch, due });
    save();
    return;
  }
  useCheckInStore.setState({ stretch, due });
  if (now - lastSaved >= SAVE_EVERY_MS) {
    lastSaved = now;
    save();
  }
}

let lastSaved = 0;

/** "Take 5": a break starts (the break view opens) and the next stretch starts from zero. */
export function takeBreakNow(now = Date.now()): void {
  useCheckInStore.setState((s) => ({ due: false, stretch: afterBreak(s.stretch, now) }));
  save();
  startBreak(now);
}

/** "Not now": the check-in goes away until 90 minutes from when it showed. */
export function notNow(): void {
  useCheckInStore.setState({ due: false });
  save();
}

let stop: (() => void) | null = null;

/** Starts listening to the activity clock and the focus timer (once, from the ADHD layer). */
export function watchCheckIn(now = Date.now()): () => void {
  if (stop) return stop;
  useCheckInStore.setState({ stretch: restore(now), due: false });
  const unlisten = onActivityCounted((counted, at) => noteActivity(counted, at));
  // A focus break is a break: the stretch starts again.
  const unsubscribe = useFocusTimerStore.subscribe((s, prev) => {
    if (s.mode === "break" && prev.mode !== "break") {
      useCheckInStore.setState((c) => ({ due: false, stretch: afterBreak(c.stretch, Date.now()) }));
      save();
    }
  });
  const onHide = () => save();
  window.addEventListener("pagehide", onHide);
  stop = () => {
    unlisten();
    unsubscribe();
    window.removeEventListener("pagehide", onHide);
    stop = null;
  };
  return stop;
}
