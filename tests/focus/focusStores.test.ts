// @vitest-environment jsdom
// The focus layer's stores (F31): a block starts with its line and ends with an outcome counted
// in ActivityDay.focusBlocks; notices wait during a block and show at the break; a running block
// survives a reload; parked thoughts come back at their time, go onto today's or tomorrow's plan,
// sync through the artifact's db and merge newer-wins on import.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareRepository } from "@/lib/storage";
import { ClaudeDbRepository } from "@/lib/storage/ClaudeDbRepository";
import { mergeExportData } from "@/lib/storage/exportImport";
import { MemoryRepository } from "@/lib/storage/MemoryRepository";
import { FakeClaudeDb } from "@/lib/runtime/fakeClaude";
import { addDaysToDate, localDate } from "@/lib/time";
import type { ParkedThought } from "@/lib/types";
import { useActivityStore } from "@/stores/activityStore";
import {
  answerBlock,
  askToStartBlock,
  blockActive,
  finishBlock,
  focusDurations,
  leaveBreak,
  releaseHeldNotices,
  restoreFocusBlock,
  showHeldNow,
  startBlock,
  startBreak,
  suggestedLine,
  useFocusLineStore,
  useFocusTimerStore,
} from "@/stores/focusTimerStore";
import { hydrateAll } from "@/stores/hydrate";
import {
  addThoughtToToday,
  dismissThought,
  markThoughtDone,
  parkThought,
  planTomorrow,
  restoreThought,
  useParkStore,
} from "@/stores/parkStore";
import { usePlanStore } from "@/stores/planStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast, useToastStore } from "@/stores/toastStore";
import { asBackup, fullFixture } from "../fixtures/userData";

let repo: MemoryRepository;

function resetFocus() {
  leaveBreak();
  useFocusTimerStore.setState({ held: [], heldShown: false, asking: null, ended: null });
  useFocusLineStore.setState({ line: "", refId: null });
  useToastStore.setState({ toasts: [] });
}

beforeEach(async () => {
  localStorage.clear();
  repo = new MemoryRepository();
  await prepareRepository(repo);
  await hydrateAll(repo);
  resetFocus();
});

afterEach(() => {
  resetFocus();
  vi.useRealTimers();
});

const today = () => localDate();
const blocksToday = () =>
  useActivityStore.getState().months[today().slice(0, 7)]?.days[today()]?.focusBlocks;

describe("focus blocks", () => {
  it("start with their line and end with how they went", () => {
    startBlock("  Re-solve 69. Sqrt(x) ");
    const s = useFocusTimerStore.getState();
    expect(s).toMatchObject({ mode: "focus", running: true, intention: "Re-solve 69. Sqrt(x)" });
    expect(blockActive(s)).toBe(true);

    finishBlock();
    const after = useFocusTimerStore.getState();
    expect(after.ended).toEqual({ intention: "Re-solve 69. Sqrt(x)", date: today() });
    // The break starts and fills the screen.
    expect(after).toMatchObject({ mode: "break", running: true, breakOpen: true });

    answerBlock("partly");
    expect(useFocusTimerStore.getState().ended).toBeNull();
    expect(blocksToday()).toEqual({ partly: 1 });
    startBlock("Learn paging");
    finishBlock();
    answerBlock("done");
    startBlock("Drill");
    finishBlock();
    answerBlock("movedOn");
    expect(blocksToday()).toEqual({ partly: 1, done: 1, movedOn: 1 });

    leaveBreak();
    expect(useFocusTimerStore.getState()).toMatchObject({
      mode: "focus",
      running: false,
      breakOpen: false,
    });
  });

  it("take a break from the timer: the break view opens without a question", () => {
    startBreak();
    expect(useFocusTimerStore.getState()).toMatchObject({
      mode: "break",
      running: true,
      breakOpen: true,
      ended: null,
    });
  });

  it("without the break view, end in a question and a break ready to start", () => {
    useProfileStore.getState().updatePrefs({ focus: { breakView: false } });
    startBlock("Learn paging");
    finishBlock();
    expect(useFocusTimerStore.getState()).toMatchObject({
      mode: "break",
      running: false,
      breakOpen: false,
      ended: { intention: "Learn paging" },
    });
  });

  it("fill in the line from the page, a matching plan item or the next plan item", () => {
    const date = today();
    usePlanStore.setState({
      plans: {
        [date]: {
          date,
          budgetMinutes: 60,
          minimumDay: false,
          generatedAt: "",
          updatedAt: "",
          items: [
            {
              id: "i1",
              kind: "learn-concept",
              refId: "os.memory.paging",
              title: "Learn: Paging",
              reason: "",
              estMinutes: 25,
              done: false,
              skipped: false,
            },
            {
              id: "i2",
              kind: "resolve",
              refId: "lc-69",
              title: "Re-solve: 69. Sqrt(x)",
              reason: "",
              estMinutes: 15,
              done: false,
              skipped: false,
            },
          ],
        },
      },
    });
    expect(suggestedLine(date)).toEqual({ line: "Learn Paging", planItemId: "i1" });
    useFocusLineStore.setState({ line: "Solve 69. Sqrt(x)", refId: "lc-69" });
    expect(suggestedLine(date)).toEqual({ line: "Re-solve 69. Sqrt(x)", planItemId: "i2" });
    useFocusLineStore.setState({ line: "Finish a pattern drill", refId: null });
    expect(suggestedLine(date)).toEqual({ line: "Finish a pattern drill", planItemId: null });
    askToStartBlock();
    expect(useFocusTimerStore.getState().asking).toEqual({
      line: "Finish a pattern drill",
      planItemId: null,
    });
  });

  it("survive a reload while they run, and are dropped once they would have ended", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 27, 12, 0));
    startBlock("Learn paging");
    vi.setSystemTime(new Date(2026, 8, 27, 12, 10));
    // Wire up the mirror, as the shell does on start; the block is already running.
    restoreFocusBlock();
    useFocusTimerStore.setState({ intention: "Learn paging, then TLB" });
    const saved = JSON.parse(localStorage.getItem("atlas.focusBlock")!);
    expect(saved).toMatchObject({ running: true, intention: "Learn paging, then TLB" });

    // "Reload": the store starts empty, then restores.
    useFocusTimerStore.setState({
      mode: "focus",
      running: false,
      startedAt: null,
      accumulatedMs: 0,
      intention: "",
    });
    localStorage.setItem("atlas.focusBlock", JSON.stringify(saved));
    restoreFocusBlock(new Date(2026, 8, 27, 12, 12).getTime());
    expect(useFocusTimerStore.getState()).toMatchObject({
      mode: "focus",
      running: true,
      intention: "Learn paging, then TLB",
    });

    useFocusTimerStore.setState({
      mode: "focus",
      running: false,
      startedAt: null,
      accumulatedMs: 0,
      intention: "",
    });
    localStorage.setItem("atlas.focusBlock", JSON.stringify(saved));
    restoreFocusBlock(new Date(2026, 8, 27, 12, 40).getTime());
    expect(useFocusTimerStore.getState().running).toBe(false);
    expect(localStorage.getItem("atlas.focusBlock")).toBeNull();
  });
});

describe("held notices", () => {
  it("wait during a block, while errors that block work show at once", () => {
    startBlock("Learn paging");
    toast("Sync is slow; retrying.", { notice: true, id: "storage-retrying" });
    toast("Couldn't save your note.", { tone: "error" });
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual([
      "Couldn't save your note.",
    ]);
    expect(useFocusTimerStore.getState().held.map((t) => t.message)).toEqual([
      "Sync is slow; retrying.",
    ]);
    // A direct answer to the owner (not a notice) always shows.
    toast("Parked for tonight.", { tone: "success" });
    expect(useToastStore.getState().toasts).toHaveLength(2);

    // At the break they all show.
    finishBlock();
    expect(useFocusTimerStore.getState().held).toEqual([]);
    expect(useToastStore.getState().toasts.map((t) => t.message)).toContain(
      "Sync is slow; retrying.",
    );
  });

  it("show when the owner asks, when the block stops, or never wait when turned off", () => {
    startBlock("A");
    toast("Note one", { notice: true, id: "n1" });
    showHeldNow();
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(["Note one"]);
    toast("Note two", { notice: true, id: "n2" });
    expect(useToastStore.getState().toasts).toHaveLength(2);

    useToastStore.setState({ toasts: [] });
    startBlock("B");
    toast("Note three", { notice: true, id: "n3" });
    expect(useToastStore.getState().toasts).toHaveLength(0);
    useFocusTimerStore.getState().reset();
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(["Note three"]);

    useToastStore.setState({ toasts: [] });
    useProfileStore.getState().updatePrefs({ focus: { holdNotices: false } });
    startBlock("C");
    toast("Note four", { notice: true, id: "n4" });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    releaseHeldNotices();
  });

  it("don't wait while the block is paused or outside a block", () => {
    toast("Outside", { notice: true, id: "o" });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    startBlock("A");
    useFocusTimerStore.getState().pause();
    toast("Paused", { notice: true, id: "p" });
    expect(useToastStore.getState().toasts).toHaveLength(2);
  });
});

describe("Park it", () => {
  const thoughts = () => Object.values(useParkStore.getState().thoughts);

  it("saves a thought that comes back when the running block ends", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 27, 12, 0));
    startBlock("Learn paging");
    vi.setSystemTime(new Date(2026, 8, 27, 12, 5));
    const t = parkThought("  Email the   recruiter ", "break");
    expect(t.text).toBe("Email the recruiter");
    expect(new Date(t.dueAt).getTime()).toBe(
      new Date(2026, 8, 27, 12, 0).getTime() + focusDurations().focus,
    );
    expect(await repo.parkedThoughts.get(t.id)).toEqual(t);
    // Parked before the block with a later time: due as soon as a break begins.
    leaveBreak();
    const early = parkThought("Look up TCP", "break", new Date(2026, 8, 27, 12, 6));
    startBlock("Next");
    vi.setSystemTime(new Date(2026, 8, 27, 12, 10));
    finishBlock();
    const now = new Date(2026, 8, 27, 12, 10).toISOString();
    expect(useParkStore.getState().thoughts[early.id]!.dueAt <= now).toBe(true);
  });

  it("marks done, dismisses with undo, and adds to today's plan as the owner's item", async () => {
    const a = parkThought("Read about TLB shootdowns", "tonight");
    markThoughtDone(a.id);
    expect(useParkStore.getState().thoughts[a.id]!.doneAt).toBeDefined();

    const b = parkThought("Check the drill scoring", "break");
    const removed = dismissThought(b.id)!;
    expect(useParkStore.getState().thoughts[b.id]).toBeUndefined();
    expect(await repo.parkedThoughts.get(b.id)).toBeUndefined();
    restoreThought(removed);
    expect(useParkStore.getState().thoughts[b.id]!.text).toBe("Check the drill scoring");

    addThoughtToToday(b.id);
    const item = usePlanStore.getState().plans[today()]!.items.find((i) => i.refId === b.id)!;
    expect(item).toMatchObject({
      kind: "thought",
      title: "Check the drill scoring",
      origin: "owner",
      done: false,
    });
    expect(useParkStore.getState().thoughts[b.id]!.doneAt).toBeDefined();
    expect(thoughts().filter((t) => !t.doneAt)).toHaveLength(0);
  });

  it("puts tonight's thoughts on tomorrow's plan, keeping what is already there", async () => {
    vi.useFakeTimers();
    const night = new Date(2026, 8, 27, 22, 40);
    vi.setSystemTime(night);
    const tomorrow = addDaysToDate(localDate(night), 1);
    await repo.dayPlans.put({
      date: tomorrow,
      budgetMinutes: 90,
      minimumDay: false,
      generatedAt: "",
      updatedAt: "",
      items: [
        {
          id: "x",
          kind: "learn-concept",
          refId: "os.memory.paging",
          title: "Learn: Paging",
          reason: "Added by you.",
          estMinutes: 25,
          done: false,
          skipped: false,
          origin: "owner",
        },
      ],
    });
    parkThought("Look up TCP slow start", "tonight", night);
    parkThought("Ask about Friday", "tomorrow", night);
    expect(await planTomorrow(night)).toBe(1);
    const plan = await repo.dayPlans.get(tomorrow);
    expect(plan!.items.map((i) => i.title)).toEqual(["Learn: Paging", "Look up TCP slow start"]);
    expect(await planTomorrow(night)).toBe(0);
  });
});

describe("parked thoughts in storage", () => {
  const T = (s: string) => `2026-09-${s}.000Z`;
  const base: ParkedThought = {
    id: "p1",
    text: "Old text",
    when: "tonight",
    dueAt: T("27T13:30:00"),
    createdAt: T("27T06:00:00"),
    updatedAt: T("27T06:00:00"),
  };

  it("merge newer-wins on import", () => {
    const current = { ...fullFixture(), parkedThoughts: [base] };
    const incoming = {
      ...fullFixture(),
      parkedThoughts: [
        { ...base, text: "New text", doneAt: T("27T09:00:00"), updatedAt: T("27T09:00:00") },
        { ...base, id: "p2", text: "Only in the file" },
      ],
    };
    const { merged, summary } = mergeExportData(current, incoming);
    expect(merged.parkedThoughts.map((t) => [t.id, t.text, Boolean(t.doneAt)])).toEqual([
      ["p1", "New text", true],
      ["p2", "Only in the file", false],
    ]);
    expect(summary.tables.parkedThoughts).toEqual({ added: 1, updated: 1, unchanged: 0 });
    // An older copy never wins.
    const back = mergeExportData(merged, current);
    expect(back.merged.parkedThoughts.find((t) => t.id === "p1")!.text).toBe("New text");
  });

  it("round-trip through export and import", async () => {
    const source = new MemoryRepository();
    await source.importAll(asBackup(fullFixture()), "replace");
    const file = await source.exportAll();
    expect(file.data.parkedThoughts.map((t) => t.id)).toEqual(["pt1", "pt2"]);
    const target = new MemoryRepository();
    await target.importAll(JSON.parse(JSON.stringify(file)), "replace");
    expect(await target.parkedThoughts.list()).toEqual(file.data.parkedThoughts);
  });

  it("sync through the artifact's db and survive a reload", async () => {
    const db = new FakeClaudeDb();
    const first = await ClaudeDbRepository.open(db, "owner-1", {
      debounceMs: 0,
      retryDelayMs: () => 0,
    });
    await first.parkedThoughts.put(base);
    await first.flush();
    expect([...db.docs.keys()].some((k) => k.endsWith("/parkedThoughts"))).toBe(true);
    const second = await ClaudeDbRepository.open(db, "owner-1", {
      debounceMs: 0,
      retryDelayMs: () => 0,
    });
    expect(await second.parkedThoughts.get("p1")).toEqual(base);
  });
});
