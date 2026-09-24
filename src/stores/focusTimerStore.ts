// The focus timer in the top bar (F29): focus and break sessions (25 and 5 minutes by default,
// set in Settings). Focus time counts toward today's activity through the activity clock.
import { create } from "zustand";
import { startActivitySource, stopActivitySource } from "./activityStore";

export type FocusMode = "focus" | "break";

interface FocusTimerState {
  mode: FocusMode;
  running: boolean;
  /** When the current run started (ms since epoch), null while paused. */
  startedAt: number | null;
  /** Time run before the current start. */
  accumulatedMs: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  setMode: (mode: FocusMode) => void;
}

const SOURCE = "focus";

export const useFocusTimerStore = create<FocusTimerState>((set, get) => ({
  mode: "focus",
  running: false,
  startedAt: null,
  accumulatedMs: 0,
  start: () => {
    if (get().running) return;
    set({ running: true, startedAt: Date.now() });
    if (get().mode === "focus") startActivitySource(SOURCE);
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
    set({ running: false, startedAt: null, accumulatedMs: 0 });
    stopActivitySource(SOURCE);
  },
  setMode: (mode) => {
    set({ mode, running: false, startedAt: null, accumulatedMs: 0 });
    stopActivitySource(SOURCE);
  },
}));

export function focusElapsedMs(
  state: Pick<FocusTimerState, "startedAt" | "accumulatedMs">,
  now = Date.now(),
): number {
  return state.accumulatedMs + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt));
}
