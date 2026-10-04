// @vitest-environment jsdom
// ADHD mode's stores (F32, session 9.4): the switch persists and syncs through the artifact's db;
// steps tick on the plan item and drop ink that is never taken away; the Now card's clock and the
// 2-minute start; how long an item took, the learned pace (synced, merged on import, capped at
// 20); the finished-day flag; a flashcard round's steps ticking as concepts get checked; the
// 90-minute check-in; where you left off; ADHD mode's block lengths; Fresh start with Undo.
// With ADHD mode off, finishing an item is exactly as before.
import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CHECK_IN_AFTER_MS } from "@/lib/adhd/checkIn";
import { nextAdhdPrefs } from "@/lib/adhd/prefs";
import { prepareRepository } from "@/lib/storage";
import { ClaudeDbRepository } from "@/lib/storage/ClaudeDbRepository";
import { mergeExportData } from "@/lib/storage/exportImport";
import { MemoryRepository } from "@/lib/storage/MemoryRepository";
import { FakeClaudeDb } from "@/lib/runtime/fakeClaude";
import { addDaysToDate, localDate, nowIso } from "@/lib/time";
import type { AdhdPrefs, DayPlan, PaceSample, PlanItem } from "@/lib/types";
import { useActivityStore } from "@/stores/activityStore";
import { setAdhd, setAdhdOn, useAdhdUi } from "@/stores/adhdStore";
import { noteActivity, notNow, useCheckInStore, watchCheckIn } from "@/stores/checkInStore";
import { recordChecks, useConceptStateStore } from "@/stores/conceptStateStore";
import {
  finishBlock,
  focusDurations,
  leaveBreak,
  startBlock,
  useFocusTimerStore,
} from "@/stores/focusTimerStore";
import { hydrateAll } from "@/stores/hydrate";
import {
  clearNow,
  keepGoing,
  MAX_GAP_MS,
  nowElapsedMs,
  plannedFor,
  resetNow,
  restoreNowClock,
  startNow,
  stopHere,
  tickCheckedCards,
  tickNextStep,
  tickNow,
  tickStep,
  TRIAL_MS,
  useNowStore,
} from "@/stores/nowStore";
import { paceFor, recordPace, usePaceStore } from "@/stores/paceStore";
import { checkReturn, dismissPlace, notePlace, usePlaceStore } from "@/stores/placeStore";
import { markPlanItemDone } from "@/stores/planEffects";
import { notePlanWritten, setPlanItemDone, usePlanStore } from "@/stores/planStore";
import { useProfileStore } from "@/stores/profileStore";
import { useToastStore } from "@/stores/toastStore";
import { asBackup, fullFixture } from "../fixtures/userData";

let repo: MemoryRepository;
const today = () => localDate();
const day = () => useActivityStore.getState().months[today().slice(0, 7)]?.days[today()];

function item(id: string, kind: PlanItem["kind"], extra: Partial<PlanItem> = {}): PlanItem {
  return {
    id,
    kind,
    title: `${kind}: ${id}`,
    reason: "For the test.",
    estMinutes: 15,
    done: false,
    skipped: false,
    origin: "planner",
    ...extra,
  };
}

function plan(items: PlanItem[]): DayPlan {
  const stamp = nowIso();
  const p: DayPlan = {
    date: today(),
    budgetMinutes: 60,
    minimumDay: false,
    items,
    generatedAt: stamp,
    plannedAt: stamp,
    updatedAt: stamp,
  };
  notePlanWritten(p);
  return p;
}

const planItem = (id: string) =>
  usePlanStore.getState().plans[today()]!.items.find((i) => i.id === id)!;

function adhdOn(changes: Partial<AdhdPrefs> = {}) {
  setAdhd({ ...nextAdhdPrefs(undefined, { on: true }), ...changes });
}

beforeEach(async () => {
  localStorage.clear();
  repo = new MemoryRepository();
  await prepareRepository(repo);
  await hydrateAll(repo);
  resetNow();
  useToastStore.setState({ toasts: [] });
  useAdhdUi.setState({ introOpen: false });
});

afterEach(() => {
  resetNow();
  leaveBreak();
  dismissPlace();
});

describe("the switch", () => {
  it("is off until turned on; the first time opens the card that lists what changed", () => {
    expect(useProfileStore.getState().profile!.prefs.adhd).toBeUndefined();
    setAdhdOn(true);
    const adhd = useProfileStore.getState().profile!.prefs.adhd!;
    expect(adhd).toMatchObject({ on: true, blockMinutes: 15, breakMinutes: 5, sound: "off" });
    expect(adhd.studyWithClaude).toBe(false);
    expect(adhd.introSeenAt).toBeTruthy();
    expect(useAdhdUi.getState().introOpen).toBe(true);
    useAdhdUi.setState({ introOpen: false });
    setAdhdOn(false);
    setAdhdOn(true);
    expect(useAdhdUi.getState().introOpen).toBe(false);
  });

  it("is saved with the profile and syncs through the artifact's db", async () => {
    const db = new FakeClaudeDb();
    const options = { debounceMs: 0, retryDelayMs: () => 0 };
    const first = await ClaudeDbRepository.open(db, "owner-1", options);
    await prepareRepository(first);
    await hydrateAll(first);
    setAdhdOn(true);
    setAdhd({ place: false, sound: "pink" });
    // The profile store writes in the background: let the write reach the repository.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await first.flush();
    const second = await ClaudeDbRepository.open(db, "owner-1", options);
    const synced = (await second.profile.get())!.prefs.adhd!;
    expect(synced).toMatchObject({ on: true, place: false, sound: "pink" });
  });

  it("gives focus blocks ADHD mode's own lengths while its breaks part is on", () => {
    expect(focusDurations()).toEqual({ focus: 25 * 60_000, break: 5 * 60_000 });
    adhdOn();
    expect(focusDurations()).toEqual({ focus: 15 * 60_000, break: 5 * 60_000 });
    setAdhd({ blockMinutes: 20, breakMinutes: 10 });
    expect(focusDurations()).toEqual({ focus: 20 * 60_000, break: 10 * 60_000 });
    setAdhd({ breaks: false });
    expect(focusDurations()).toEqual({ focus: 25 * 60_000, break: 5 * 60_000 });
  });
});

describe("steps and ink", () => {
  it("tick on the plan item, drop ink once per new tick, and never take ink away", () => {
    adhdOn();
    plan([item("r1", "resolve", { refId: "lc-69" }), item("n1", "new-problem")]);
    tickStep(today(), "r1", 0, true);
    expect(planItem("r1").steps).toEqual([true, false, false, false, false]);
    expect(day()?.stepsDone).toBe(1);
    tickStep(today(), "r1", 0, false);
    expect(planItem("r1").steps![0]).toBe(false);
    expect(day()?.stepsDone).toBe(1);
    tickNextStep(today(), "r1");
    tickNextStep(today(), "r1");
    expect(planItem("r1").steps).toEqual([true, true, false, false, false]);
    expect(day()?.stepsDone).toBe(3);
  });

  it("finish the item at the last tick, and a Done ticks the rest", () => {
    adhdOn();
    plan([item("r1", "resolve"), item("l1", "learn-concept")]);
    for (let i = 0; i < 5; i++) tickNextStep(today(), "r1");
    expect(planItem("r1").done).toBe(true);
    expect(day()?.stepsDone).toBe(5);
    tickStep(today(), "l1", 0, true);
    setPlanItemDone(today(), "l1", true);
    expect(planItem("l1").steps).toEqual([true, true, true, true]);
    expect(day()?.stepsDone).toBe(9);
    // Every stop is done: the day leaves a flag, once.
    expect(day()?.planFinished).toBe(1);
    setPlanItemDone(today(), "l1", false);
    setPlanItemDone(today(), "l1", true);
    expect(day()?.planFinished).toBe(1);
  });

  it("tick a flashcard round's concepts as they get their checks", () => {
    adhdOn();
    const ids = ["dsa.hashing.complement-lookup", "os.deadlocks.deadlock-conditions"];
    plan([item("f1", "review-concept", { refIds: ids })]);
    recordChecks([{ conceptId: ids[0]!, kind: "flashcard", score: 0.8 }]);
    tickCheckedCards();
    expect(planItem("f1").steps).toEqual([true, false]);
    expect(day()?.stepsDone).toBe(1);
  });

  it("leave finishing an item exactly as before with ADHD mode off", async () => {
    plan([item("r1", "resolve", { refId: "lc-1" })]);
    await markPlanItemDone(repo, today(), "lc-1", ["resolve"], { took: 20 });
    const done = planItem("r1");
    expect(done.done).toBe(true);
    expect(done.steps).toBeUndefined();
    expect(done.took).toBeUndefined();
    expect(day()?.stepsDone).toBeUndefined();
    expect(day()?.planFinished).toBeUndefined();
    expect(usePaceStore.getState().stats).toEqual({});
  });
});

describe("the Now card's clock", () => {
  it("asks at the 2-minute mark, then keeps going or stops there", () => {
    adhdOn();
    plan([item("r1", "resolve")]);
    const t0 = Date.now();
    startNow(today(), planItem("r1"), { trial: true, now: t0 });
    for (let t = t0 + 5_000; t <= t0 + TRIAL_MS + 5_000; t += 5_000) tickNow(t);
    expect(useNowStore.getState().clock!.trial).toBe("ask");
    keepGoing();
    expect(useNowStore.getState().clock!.trial).toBeUndefined();
    expect(useNowStore.getState().clock!.lastAt).not.toBeNull();

    startNow(today(), planItem("r1"), { trial: true, now: t0 + 200_000 });
    stopHere(t0 + 205_000);
    const stopped = useNowStore.getState().clock!;
    expect(stopped.lastAt).toBeNull();
    expect(stopped.trial).toBeUndefined();
    expect(stopped.workedMs).toBeGreaterThanOrEqual(TRIAL_MS);
  });

  it("doesn't count a gap longer than two minutes (sleep, a closed tab)", () => {
    adhdOn();
    plan([item("r1", "resolve")]);
    const t0 = Date.now();
    startNow(today(), planItem("r1"), { now: t0 });
    tickNow(t0 + 60_000);
    tickNow(t0 + 60_000 + MAX_GAP_MS + 1);
    expect(useNowStore.getState().clock!.workedMs).toBe(60_000);
    expect(nowElapsedMs(useNowStore.getState().clock!, t0 + 60_000 + MAX_GAP_MS + 1)).toBe(60_000);
  });

  it("comes back after a reload in this browser, but not on another day", () => {
    adhdOn();
    plan([item("r1", "resolve")]);
    const t0 = Date.now();
    restoreNowClock(t0); // starts mirroring
    startNow(today(), planItem("r1"), { now: t0 });
    tickNow(t0 + 30_000);
    // A reload: memory starts empty, and this browser kept the clock.
    const reload = (raw: string) => {
      useNowStore.setState({ clock: null });
      localStorage.setItem("atlas.nowClock", raw);
    };
    const saved = localStorage.getItem("atlas.nowClock")!;
    reload(saved);
    restoreNowClock(t0 + 35_000);
    const back = useNowStore.getState().clock!;
    expect(back.itemId).toBe("r1");
    expect(back.workedMs).toBe(30_000);
    reload(JSON.stringify({ ...JSON.parse(saved), date: addDaysToDate(today(), -1) }));
    restoreNowClock(t0 + 40_000);
    expect(useNowStore.getState().clock).toBeNull();
    clearNow();
  });
});

describe("time you can see", () => {
  it("notes how long an item took and learns the pace from it", () => {
    adhdOn();
    plan([
      item("r1", "resolve"),
      item("r2", "resolve"),
      item("r3", "resolve"),
      item("r4", "resolve"),
    ]);
    const t0 = Date.now() - 60 * 60_000;
    for (const [id, minutes] of [
      ["r1", 22],
      ["r2", 20],
      ["r3", 30],
    ] as const) {
      startNow(today(), planItem(id), { now: t0 });
      for (let t = t0 + 60_000; t <= t0 + minutes * 60_000; t += 60_000) tickNow(t);
      useNowStore.setState((s) => ({ clock: { ...s.clock!, lastAt: null } }));
      setPlanItemDone(today(), id, true);
      expect(planItem(id).took).toBe(minutes);
    }
    expect(useNowStore.getState().finished).toMatchObject({ itemId: "r3", planned: 15, took: 30 });
    expect(useToastStore.getState().toasts.map((t) => t.message)).toContain("Planned 15, took 30.");
    expect(usePaceStore.getState().stats.resolve!.samples).toHaveLength(3);
    // Median of 22/15, 20/15, 30/15 is 22/15: estimates are scaled by it.
    expect(paceFor("resolve")).toBeCloseTo(22 / 15);
    expect(plannedFor(planItem("r4"))).toBe(22);
  });

  it("uses a saved attempt's minutes when no clock ran", async () => {
    adhdOn();
    plan([item("r1", "resolve", { refId: "lc-1" })]);
    await markPlanItemDone(repo, today(), "lc-1", ["resolve"], { took: 18 });
    expect(planItem("r1").took).toBe(18);
    expect(usePaceStore.getState().stats.resolve!.samples[0]).toMatchObject({
      planned: 15,
      took: 18,
    });
  });

  it("keeps the newest 20 samples per kind, syncs them as one document and merges them", async () => {
    const sample = (n: number): PaceSample => ({
      id: `d:${n}`,
      planned: 10,
      took: 10 + n,
      at: new Date(Date.UTC(2026, 8, 1, 0, n)).toISOString(),
    });
    for (let n = 0; n < 25; n++) recordPace("drill", sample(n));
    expect(usePaceStore.getState().stats.drill!.samples).toHaveLength(20);
    expect(usePaceStore.getState().stats.drill!.samples[0]!.id).toBe("d:5");

    const db = new FakeClaudeDb();
    const options = { debounceMs: 0, retryDelayMs: () => 0 };
    const first = await ClaudeDbRepository.open(db, "owner-1", options);
    await first.paceStats.put(usePaceStore.getState().stats.drill!);
    await first.paceStats.put({ kind: "resolve", samples: [sample(1)], updatedAt: nowIso() });
    await first.flush();
    expect([...db.docs.keys()].filter((k) => k.endsWith("/paceStats"))).toHaveLength(1);
    const second = await ClaudeDbRepository.open(db, "owner-1", options);
    expect((await second.paceStats.get("drill"))!.samples).toHaveLength(20);

    const current = { ...fullFixture() };
    const incoming = {
      ...fullFixture(),
      paceStats: [
        {
          kind: "resolve" as const,
          samples: [{ id: "2026-09-21:p9", planned: 25, took: 40, at: "2026-09-21T10:00:00.000Z" }],
          updatedAt: "2026-09-21T10:00:00.000Z",
        },
      ],
    };
    const { merged } = mergeExportData(current, incoming);
    expect(merged.paceStats[0]!.samples.map((s) => s.id)).toEqual([
      "2026-09-19:resolve:lc-146",
      "2026-09-20:p1",
      "2026-09-21:p9",
    ]);
  });

  it("round-trips ADHD mode's settings, steps and pace through a backup", async () => {
    const file = asBackup(fullFixture());
    const target = new MemoryRepository();
    await target.importAll(JSON.parse(JSON.stringify(file)), "replace");
    const back = await target.exportAll();
    expect(back.data.profile!.prefs.adhd).toEqual(file.data.profile!.prefs.adhd);
    expect(back.data.dayPlans[0]!.items[0]).toMatchObject({
      steps: [true, true, true, true, true],
      took: 22,
    });
    expect(back.data.paceStats).toEqual(file.data.paceStats);
  });
});

describe("breaks that work", () => {
  it("check in after 90 minutes of activity without a break, at most once per 90 minutes", () => {
    adhdOn();
    watchCheckIn();
    const t0 = Date.now();
    useCheckInStore.setState({ stretch: { ms: 0, lastAt: t0 }, due: false });
    let t = t0;
    for (let m = 1; m <= 90; m++) noteActivity(60_000, (t += 60_000));
    expect(useCheckInStore.getState().due).toBe(true);
    notNow();
    for (let m = 1; m <= 60; m++) noteActivity(60_000, (t += 60_000));
    expect(useCheckInStore.getState().due).toBe(false);
    for (let m = 1; m <= 30; m++) noteActivity(60_000, (t += 60_000));
    expect(useCheckInStore.getState().due).toBe(true);
  });

  it("don't check in while a focus block runs, and a break starts a fresh stretch", () => {
    adhdOn();
    watchCheckIn();
    const t0 = Date.now();
    useCheckInStore.setState({ stretch: { ms: CHECK_IN_AFTER_MS, lastAt: t0 }, due: false });
    startBlock("Re-solve 69");
    noteActivity(1_000, t0 + 1_000);
    expect(useCheckInStore.getState().due).toBe(false);
    finishBlock();
    expect(useFocusTimerStore.getState().mode).toBe("break");
    expect(useCheckInStore.getState().stretch.ms).toBe(0);
  });

  it("stay quiet with ADHD mode's breaks part off", () => {
    adhdOn({ breaks: false });
    watchCheckIn();
    const t0 = Date.now();
    useCheckInStore.setState({ stretch: { ms: CHECK_IN_AFTER_MS, lastAt: t0 }, due: false });
    noteActivity(1_000, t0 + 1_000);
    expect(useCheckInStore.getState().due).toBe(false);
  });
});

describe("where you left off", () => {
  it("shows after 10 minutes or more away, with the page, item and step", () => {
    window.location.hash = "#/problems/lc-69?mode=resolve";
    document.title = "Sqrt(x) – Atlas";
    const t0 = Date.now();
    notePlace(t0);
    checkReturn(t0 + 5 * 60_000);
    expect(usePlaceStore.getState().back).toBeNull();
    notePlace(t0);
    checkReturn(t0 + 12 * 60_000);
    const back = usePlaceStore.getState().back!;
    expect(back.place).toMatchObject({ path: "/problems/lc-69?mode=resolve", title: "Sqrt(x)" });
    expect(back.awayMs).toBe(12 * 60_000);
  });
});

describe("Fresh start", () => {
  it("moves only due dates and can be undone", async () => {
    const { setProblemDueDates, restoreSnapshot, useProblemStore } =
      await import("@/stores/problemStore");
    const { setConceptDueDates, restoreConceptStates } = await import("@/stores/conceptStateStore");
    await repo.importAll(asBackup(fullFixture()), "replace");
    await hydrateAll(repo);
    const before = useProblemStore.getState().states["lc-1"]!;
    const conceptBefore = useConceptStateStore.getState().states["dsa.hashing.complement-lookup"]!;
    const snapshot = setProblemDueDates({ "lc-1": "2030-01-02" });
    const conceptSnapshot = setConceptDueDates({ "dsa.hashing.complement-lookup": "2030-01-03" });
    const after = useProblemStore.getState().states["lc-1"]!;
    expect(after.srs).toEqual({ ...before.srs, dueAt: "2030-01-02" });
    expect(after.attempts).toEqual(before.attempts);
    const conceptAfter = useConceptStateStore.getState().states["dsa.hashing.complement-lookup"]!;
    expect(conceptAfter.srs).toEqual({ ...conceptBefore.srs, dueAt: "2030-01-03" });
    restoreSnapshot(snapshot);
    restoreConceptStates(conceptSnapshot);
    expect(useProblemStore.getState().states["lc-1"]!.srs).toEqual(before.srs);
    expect(useConceptStateStore.getState().states["dsa.hashing.complement-lookup"]!.srs).toEqual(
      conceptBefore.srs,
    );
  });
});
