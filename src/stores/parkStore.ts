// Park it (F31): stray thoughts written down with a when (the break, tonight, tomorrow). Each one
// comes back at its time with Done, Add to today and Dismiss. Synced through the Repository (one
// grouped document in the artifact, latest 300), exported and merged newer-wins like the rest.
import { nanoid } from "nanoid";
import { create } from "zustand";
import {
  dayAfterSleep,
  morningTime,
  parkDueAt,
  tonightThoughts,
  tonightTime,
  MAX_THOUGHT_LENGTH,
  type ParkWhen,
} from "@/lib/focus/park";
import { DEFAULT_THEME_SCHEDULE } from "@/lib/constants";
import type { Repository } from "@/lib/storage/Repository";
import { localDate, nowIso, parseLocalDate } from "@/lib/time";
import type { ParkedThought } from "@/lib/types";
import { blockEndsAt, useFocusTimerStore } from "./focusTimerStore";
import { addPlanItems, addPlanItemsOn } from "./planStore";
import { useProfileStore } from "./profileStore";
import { toast } from "./toastStore";

/** What the Park it dialog opens with. */
export interface ParkRequest {
  when: ParkWhen;
  /** "Park a thought" (default), "Park what's left", "Park a worry". */
  title?: string;
}

interface ParkState {
  thoughts: Record<string, ParkedThought>;
  loaded: boolean;
  dialog: ParkRequest | null;
}

export const useParkStore = create<ParkState>(() => ({
  thoughts: {},
  loaded: false,
  dialog: null,
}));

let repo: Repository | null = null;

const saveFailed = () =>
  toast("Couldn't save that thought. Check that storage is available, then try again.", {
    tone: "error",
    id: "park-save",
  });

export async function hydrateParked(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.parkedThoughts.list();
  useParkStore.setState({
    thoughts: Object.fromEntries(list.map((t) => [t.id, t])),
    loaded: true,
  });
}

export function detachParked(): void {
  repo = null;
  useParkStore.setState({ thoughts: {}, loaded: false });
}

function write(thought: ParkedThought): void {
  useParkStore.setState((s) => ({ thoughts: { ...s.thoughts, [thought.id]: thought } }));
  repo?.parkedThoughts.put(thought).catch(saveFailed);
}

export const openPark = (request: ParkRequest = { when: "break" }) =>
  useParkStore.setState({ dialog: request });
export const closePark = () => useParkStore.setState({ dialog: null });

/** Parks a thought: it comes back at the break, tonight or tomorrow morning. */
export function parkThought(text: string, when: ParkWhen, now: Date = new Date()): ParkedThought {
  const profile = useProfileStore.getState().profile;
  const theme = profile?.theme ?? "system";
  const schedule = profile?.prefs.themeSchedule ?? { ...DEFAULT_THEME_SCHEDULE };
  const due = parkDueAt(when, {
    now,
    blockEndsAt: blockEndsAt(now.getTime()),
    focusMinutes: profile?.prefs.focusMinutes ?? 25,
    tonight: tonightTime(theme, schedule),
    morning: morningTime(theme, schedule),
  });
  const stamp = nowIso(now);
  const thought: ParkedThought = {
    id: nanoid(10),
    text: text.replace(/\s+/g, " ").trim().slice(0, MAX_THOUGHT_LENGTH),
    when,
    dueAt: due.toISOString(),
    createdAt: stamp,
    updatedAt: stamp,
  };
  write(thought);
  return thought;
}

/**
 * A break began: thoughts parked "at the break" are due now, even ones parked before the block
 * with a later time, so they stay listed after the break view closes.
 */
export function breakArrived(now: Date = new Date()): void {
  const stamp = nowIso(now);
  for (const t of Object.values(useParkStore.getState().thoughts)) {
    if (t.doneAt || t.when !== "break" || t.dueAt <= stamp) continue;
    write({ ...t, dueAt: stamp, updatedAt: stamp });
  }
}

useFocusTimerStore.subscribe((s, prev) => {
  if (s.mode === "break" && prev.mode !== "break" && s.running) breakArrived();
});

export function markThoughtDone(id: string, now: Date = new Date()): void {
  const t = useParkStore.getState().thoughts[id];
  if (!t || t.doneAt) return;
  const stamp = nowIso(now);
  write({ ...t, doneAt: stamp, updatedAt: stamp });
}

/** Removes a thought. Returns it, for Undo. */
export function dismissThought(id: string): ParkedThought | null {
  const t = useParkStore.getState().thoughts[id];
  if (!t) return null;
  useParkStore.setState((s) => {
    const thoughts = { ...s.thoughts };
    delete thoughts[id];
    return { thoughts };
  });
  repo?.parkedThoughts.delete(id).catch(saveFailed);
  return t;
}

export function restoreThought(thought: ParkedThought): void {
  write({ ...thought, updatedAt: nowIso() });
}

const shortDay = (iso: string) =>
  parseLocalDate(localDate(new Date(iso))).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

function planItemFor(t: ParkedThought) {
  return {
    kind: "thought" as const,
    refId: t.id,
    title: t.text,
    reason: `A thought you parked on ${shortDay(t.createdAt)}.`,
    estMinutes: 10,
    origin: "owner" as const,
  };
}

/** "Add to today": the thought becomes one of the owner's items on today's plan. */
export function addThoughtToToday(id: string, now: Date = new Date()): boolean {
  const t = useParkStore.getState().thoughts[id];
  if (!t) return false;
  addPlanItems([planItemFor(t)], {
    date: localDate(now),
    budget: useProfileStore.getState().profile?.dailyMinutes,
  });
  markThoughtDone(id, now);
  return true;
}

/**
 * "Plan tomorrow" (the wrap-up note): tonight's parked thoughts become the owner's items on the
 * plan of the day after sleep. Returns how many moved.
 */
export async function planTomorrow(now: Date = new Date()): Promise<number> {
  const tonight = tonightThoughts(Object.values(useParkStore.getState().thoughts));
  if (tonight.length === 0) return 0;
  await addPlanItemsOn(
    dayAfterSleep(now),
    tonight.map(planItemFor),
    useProfileStore.getState().profile?.dailyMinutes,
  );
  for (const t of tonight) markThoughtDone(t.id, now);
  return tonight.length;
}
