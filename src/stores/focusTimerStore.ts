// The focus timer (F29) and focus blocks (F31). A block starts with one line, "In this block I
// will…" (filled in from the page or the plan item), shows that line in the top bar and a
// horizon line along the window's top edge, dims what isn't the work and holds notices that
// aren't an answer to what the owner just did. When the block ends the owner says how it went
// (Done, Partly, Moved on, counted in ActivityDay.focusBlocks) and the break begins: a break
// view fills the screen until "Back to work" or Esc (Settings can turn it off).
//
// Focus time counts toward today's activity through the activity clock. A running or paused
// block is mirrored to localStorage (this browser only), so a reload keeps it; breaks are not.
import { create } from "zustand";
import { adhdPartOn, adhdSettings } from "@/lib/adhd/prefs";
import { cleanIntention, intentionForItem } from "@/lib/focus/intention";
import { focusPrefs } from "@/lib/focus/prefs";
import { localDate } from "@/lib/time";
import type { FocusOutcome } from "@/lib/types";
import { recordFocusBlock, startActivitySource, stopActivitySource } from "./activityStore";
import { usePlanStore } from "./planStore";
import { useProfileStore } from "./profileStore";
import { setToastGate, useToastStore, type ToastItem } from "./toastStore";

export type FocusMode = "focus" | "break";

export interface EndedBlock {
  intention: string;
  /** The local date the block ended on; its outcome is counted there. */
  date: string;
}

interface FocusTimerState {
  mode: FocusMode;
  running: boolean;
  /** When the current run started (ms since epoch), null while paused. */
  startedAt: number | null;
  /** Time run before the current start. */
  accumulatedMs: number;
  /** The block's line: "In this block I will…". */
  intention: string;
  /** The plan item the block is for, when it started from one. */
  planItemId: string | null;
  /** A block that just ended, waiting for Done, Partly or Moved on. */
  ended: EndedBlock | null;
  /** The break view fills the screen. */
  breakOpen: boolean;
  /** The "In this block I will…" dialog is open with this line filled in. */
  asking: { line: string; planItemId: string | null } | null;
  /** Notices held for the break (F31 held notices). */
  held: ToastItem[];
  /** The owner asked to see the held notices now: nothing more is held this block. */
  heldShown: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setMode: (mode: FocusMode) => void;
}

const SOURCE = "focus";
const STORAGE_KEY = "atlas.focusBlock";

const IDLE = { running: false, startedAt: null, accumulatedMs: 0 } as const;

export const useFocusTimerStore = create<FocusTimerState>((set, get) => ({
  mode: "focus",
  running: false,
  startedAt: null,
  accumulatedMs: 0,
  intention: "",
  planItemId: null,
  ended: null,
  breakOpen: false,
  asking: null,
  held: [],
  heldShown: false,
  start: () => {
    const s = get();
    if (s.running) return;
    // A fresh break is a real break: it opens the break view (unless turned off).
    if (s.mode === "break" && s.accumulatedMs === 0) {
      startBreak();
      return;
    }
    set({ running: true, startedAt: Date.now() });
    if (s.mode === "focus") startActivitySource(SOURCE);
  },
  pause: () => {
    const { running, startedAt, accumulatedMs } = get();
    if (!running || startedAt === null) return;
    set({
      running: false,
      startedAt: null,
      accumulatedMs: accumulatedMs + (Date.now() - startedAt),
    });
    stopActivitySource(SOURCE);
  },
  reset: () => {
    set({ ...IDLE, intention: "", planItemId: null });
    stopActivitySource(SOURCE);
  },
  setMode: (mode) => {
    set({ mode, ...IDLE, intention: "", planItemId: null });
    stopActivitySource(SOURCE);
  },
}));

export function focusElapsedMs(
  state: Pick<FocusTimerState, "startedAt" | "accumulatedMs">,
  now = Date.now(),
): number {
  return state.accumulatedMs + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt));
}

/**
 * Block and break lengths from Settings (25 and 5 minutes by default). In ADHD mode, with its
 * breaks part on, ADHD mode's own lengths apply (15 and 5 minutes by default, F32).
 */
export function focusDurations(prefs = useProfileStore.getState().profile?.prefs): {
  focus: number;
  break: number;
} {
  if (prefs && adhdPartOn(prefs, "breaks")) {
    const adhd = adhdSettings(prefs);
    return { focus: adhd.blockMinutes * 60_000, break: adhd.breakMinutes * 60_000 };
  }
  return {
    focus: (prefs?.focusMinutes ?? 25) * 60_000,
    break: (prefs?.breakMinutes ?? 5) * 60_000,
  };
}

/** A block is on: started and not ended (it may be paused). */
export function blockActive(s: Pick<FocusTimerState, "mode" | "running" | "accumulatedMs">) {
  return s.mode === "focus" && (s.running || s.accumulatedMs > 0);
}

/** A block is running right now (not paused). The lens and held notices apply only then. */
export function blockRunning(s: Pick<FocusTimerState, "mode" | "running">) {
  return s.mode === "focus" && s.running;
}

/** When the running block ends (ms since epoch), or null. */
export function blockEndsAt(now = Date.now()): number | null {
  const s = useFocusTimerStore.getState();
  if (!blockRunning(s)) return null;
  return now + Math.max(0, focusDurations().focus - focusElapsedMs(s, now));
}

// ----- starting a block ----------------------------------------------------------------------

/** What the page the owner is on suggests as the block's line (see usePageFocusLine). */
export const useFocusLineStore = create<{
  line: string;
  /** The problem or concept on screen, to match a plan item for today. */
  refId: string | null;
}>(() => ({ line: "", refId: null }));

/**
 * The line to fill in: the plan item for what's on screen, else the page's own line, else the
 * day's next plan item.
 */
export function suggestedLine(today = localDate()): { line: string; planItemId: string | null } {
  const page = useFocusLineStore.getState();
  const items = (usePlanStore.getState().plans[today]?.items ?? []).filter(
    (i) => !i.done && !i.skipped,
  );
  if (page.refId) {
    const item = items.find((i) => i.refId === page.refId || i.refIds?.includes(page.refId!));
    if (item) return { line: intentionForItem(item), planItemId: item.id };
  }
  if (page.line) return { line: page.line, planItemId: null };
  const next = items[0];
  return next
    ? { line: intentionForItem(next), planItemId: next.id }
    : { line: "", planItemId: null };
}

/** Opens "In this block I will…" (top bar, `f`, or a plan item's "Start a focus block"). */
export function askToStartBlock(from?: { line: string; planItemId?: string | null }): void {
  const s = useFocusTimerStore.getState();
  if (blockActive(s)) return;
  const suggestion = from
    ? { line: from.line, planItemId: from.planItemId ?? null }
    : suggestedLine();
  useFocusTimerStore.setState({ asking: suggestion });
}

export function cancelAskToStart(): void {
  useFocusTimerStore.setState({ asking: null });
}

export interface StartedBlock {
  intention: string;
  planItemId: string | null;
  minutes: number;
}

const startListeners = new Set<(block: StartedBlock) => void>();

/** Hears each new block as it starts (ADHD mode's Study with Claude, F32). Not on a reload. */
export function onBlockStart(listener: (block: StartedBlock) => void): () => void {
  startListeners.add(listener);
  return () => {
    startListeners.delete(listener);
  };
}

/** Starts a focus block with its line. */
export function startBlock(intention: string, planItemId: string | null = null, now = Date.now()) {
  const started: StartedBlock = {
    intention: cleanIntention(intention),
    planItemId,
    minutes: Math.round(focusDurations().focus / 60_000),
  };
  useFocusTimerStore.setState({
    mode: "focus",
    running: true,
    startedAt: now,
    accumulatedMs: 0,
    intention: cleanIntention(intention),
    planItemId,
    ended: null,
    breakOpen: false,
    asking: null,
    heldShown: false,
  });
  startActivitySource(SOURCE);
  for (const listener of startListeners) {
    try {
      listener(started);
    } catch (e) {
      console.error("A block-start listener failed", e);
    }
  }
}

// ----- ending a block and the break ------------------------------------------------------------

/** Ends the running block (on time, or "End the block now"): ask how it went, start the break. */
export function finishBlock(now = Date.now()): void {
  const s = useFocusTimerStore.getState();
  if (!blockActive(s)) return;
  stopActivitySource(SOURCE);
  const { breakView } = focusPrefs(useProfileStore.getState().profile?.prefs);
  useFocusTimerStore.setState({
    mode: "break",
    running: breakView,
    startedAt: breakView ? now : null,
    accumulatedMs: 0,
    intention: "",
    planItemId: null,
    ended: { intention: s.intention, date: localDate(new Date(now)) },
    breakOpen: breakView,
    heldShown: false,
  });
}

/** Counts the ended block under how it went. */
export function answerBlock(outcome: FocusOutcome): void {
  const ended = useFocusTimerStore.getState().ended;
  if (!ended) return;
  recordFocusBlock(ended.date, outcome);
  useFocusTimerStore.setState({ ended: null });
}

/** Leaves the question without an answer (nothing is counted). */
export function skipBlockAnswer(): void {
  useFocusTimerStore.setState({ ended: null });
}

/** Starts a break now; the break view opens unless Settings turned it off. */
export function startBreak(now = Date.now()): void {
  stopActivitySource(SOURCE);
  const { breakView } = focusPrefs(useProfileStore.getState().profile?.prefs);
  useFocusTimerStore.setState({
    mode: "break",
    running: true,
    startedAt: now,
    accumulatedMs: 0,
    intention: "",
    planItemId: null,
    breakOpen: breakView,
  });
}

/** The break's time ran out: the clock stops at zero (the break view says so). */
export function breakTimeUp(): void {
  const s = useFocusTimerStore.getState();
  if (s.mode !== "break") return;
  useFocusTimerStore.setState({
    running: false,
    startedAt: null,
    accumulatedMs: focusDurations().break,
  });
}

/** "Back to work" or Esc: the break view closes and the timer is ready for the next block. */
export function leaveBreak(): void {
  useFocusTimerStore.setState({
    mode: "focus",
    ...IDLE,
    intention: "",
    planItemId: null,
    ended: null,
    breakOpen: false,
  });
}

// ----- held notices ----------------------------------------------------------------------------

/** Notices wait while a block runs, when the owner keeps "hold notices" on (the default). */
export function holdingNotices(): boolean {
  const s = useFocusTimerStore.getState();
  return (
    blockRunning(s) &&
    !s.heldShown &&
    focusPrefs(useProfileStore.getState().profile?.prefs).holdNotices === true
  );
}

/** "Show them now": everything held appears, and nothing more is held this block. */
export function showHeldNow(): void {
  useFocusTimerStore.setState({ heldShown: true });
}

setToastGate((item) => {
  if (!holdingNotices()) return false;
  useFocusTimerStore.setState((s) => ({
    held: [...s.held.filter((h) => h.id !== item.id), item],
  }));
  return true;
});

/** Shows every held notice now (the break started, the block stopped, or the owner asked). */
export function releaseHeldNotices(): void {
  const held = useFocusTimerStore.getState().held;
  if (held.length === 0) return;
  useFocusTimerStore.setState({ held: [] });
  const push = useToastStore.getState().push;
  for (const item of held) push({ ...item, notice: false });
}

let wasHolding = false;
function watchHolding(): void {
  const now = holdingNotices();
  if (wasHolding && !now) releaseHeldNotices();
  wasHolding = now;
}
useFocusTimerStore.subscribe(watchHolding);
useProfileStore.subscribe(watchHolding);

// ----- keeping a block across a reload -----------------------------------------------------------

interface SavedBlock {
  running: boolean;
  startedAt: number | null;
  accumulatedMs: number;
  intention: string;
  planItemId: string | null;
}

function save(): void {
  const s = useFocusTimerStore.getState();
  try {
    if (!blockActive(s)) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const saved: SavedBlock = {
      running: s.running,
      startedAt: s.startedAt,
      accumulatedMs: s.accumulatedMs,
      intention: s.intention,
      planItemId: s.planItemId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    /* only a convenience */
  }
}

let saving = false;

/**
 * Brings back a block that was running (or paused) before a reload, if it hasn't ended since.
 * Called once by the shell; from then on the block is mirrored on every change.
 */
export function restoreFocusBlock(now = Date.now()): void {
  if (!saving) {
    saving = true;
    useFocusTimerStore.subscribe((s, prev) => {
      if (
        s.mode !== prev.mode ||
        s.running !== prev.running ||
        s.startedAt !== prev.startedAt ||
        s.accumulatedMs !== prev.accumulatedMs ||
        s.intention !== prev.intention
      )
        save();
    });
  }
  let saved: SavedBlock | null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    saved = raw ? (JSON.parse(raw) as SavedBlock) : null;
  } catch {
    saved = null;
  }
  if (!saved || typeof saved.accumulatedMs !== "number") return;
  if (blockActive(useFocusTimerStore.getState())) return;
  const startedAt = saved.running && typeof saved.startedAt === "number" ? saved.startedAt : null;
  const elapsed = focusElapsedMs({ startedAt, accumulatedMs: saved.accumulatedMs }, now);
  if (elapsed >= focusDurations().focus || (startedAt === null && saved.accumulatedMs <= 0)) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  useFocusTimerStore.setState({
    mode: "focus",
    running: startedAt !== null,
    startedAt,
    accumulatedMs: saved.accumulatedMs,
    intention: typeof saved.intention === "string" ? cleanIntention(saved.intention) : "",
    planItemId: typeof saved.planItemId === "string" ? saved.planItemId : null,
  });
  if (startedAt !== null) startActivitySource(SOURCE);
}
