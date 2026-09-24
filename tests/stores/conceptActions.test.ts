// F4 and F14 through the stores: checks move the concept review schedule (11.1) and statuses
// (11.2) together; manual statuses, never fade, hiding, custom concepts, notes and plan items.
import { beforeEach, describe, expect, it } from "vitest";
import { prepareRepository } from "@/lib/storage";
import { MemoryRepository } from "@/lib/storage/MemoryRepository";
import { addDaysToDate, localDate } from "@/lib/time";
import { useActivityStore } from "@/stores/activityStore";
import {
  flushNotes,
  moveAnswerIntoNote,
  setNoteMarkdown,
  useConceptNoteStore,
} from "@/stores/conceptNoteStore";
import {
  evaluateConcept,
  markStudied,
  recordChecks,
  refreshConcepts,
  restoreConceptState,
  setHidden,
  setManualStatus,
  setNeverFade,
  useConceptStateStore,
} from "@/stores/conceptStateStore";
import {
  addCustomConcept,
  deleteCustomConcept,
  findConcept,
  restoreCustomConcept,
} from "@/stores/customConceptStore";
import { hydrateAll } from "@/stores/hydrate";
import { takeInk } from "@/stores/inkStore";
import { moveNode, resetLayout, restoreOverrides, useMapStore } from "@/stores/mapStore";
import { addPlanItems, setPlanItemDone, usePlanStore } from "@/stores/planStore";

const OS = "os.processes.process-vs-program";
let repo: MemoryRepository;

const state = (id: string) => useConceptStateStore.getState().states[id];
const today = () => localDate();
const day = () => useActivityStore.getState().months[today().slice(0, 7)]?.days[today()];

beforeEach(async () => {
  repo = new MemoryRepository();
  await prepareRepository(repo);
  await hydrateAll(repo);
});

describe("concept actions", () => {
  it("marks a concept studied: learning, in review in 2 days, activity logged", async () => {
    expect(findConcept(OS)).toBeDefined();
    const before = markStudied(OS);
    expect(before).toBeNull();
    expect(state(OS)).toMatchObject({ studied: true, status: "learning", knowledge: 0.3 });
    expect(state(OS)!.srs.dueAt).toBe(addDaysToDate(today(), 2));
    expect(day()?.conceptsTouched).toBe(1);
    await repo.flush();
    expect((await repo.conceptStates.get(OS))?.studied).toBe(true);
    restoreConceptState(OS, before);
    expect(state(OS)).toBeUndefined();
  });

  it("records checks: the first starts review, a check while due moves the step", () => {
    recordChecks([{ conceptId: OS, kind: "flashcard", score: 1 }]);
    expect(state(OS)!.srs).toMatchObject({ step: 0, dueAt: addDaysToDate(today(), 2) });
    expect(state(OS)!.knowledge).toBeCloseTo(0.9);
    // Not due yet: knowledge changes, the schedule doesn't.
    recordChecks([{ conceptId: OS, kind: "flashcard", score: 0 }]);
    expect(state(OS)!.srs.step).toBe(0);
    // An explicit review session counts before the due date.
    const done = recordChecks([{ conceptId: OS, kind: "explain", score: 0.9 }], { session: true });
    expect(done.reviewed).toEqual([OS]);
    expect(state(OS)!.srs).toMatchObject({ step: 1, dueAt: addDaysToDate(today(), 5) });
    expect(useConceptStateStore.getState().checks[OS]).toHaveLength(3);
    expect(day()?.checks).toBe(3);
    expect(day()?.reviews).toBe(1);
  });

  it("turns strong with enough knowledge, logs it, and inks it once", () => {
    // A concept without linked problems needs knowledge ≥ 0.8 only.
    recordChecks([{ conceptId: OS, kind: "quiz", score: 0.9 }]);
    expect(state(OS)!.status).toBe("strong");
    expect(state(OS)!.everStrong).toBe(true);
    expect(day()?.turnedStrong).toBe(1);
    expect(takeInk(OS)).toBe(true);
    expect(takeInk(OS)).toBe(false);
  });

  it("sets a manual status; manual strong records a manual check and can be cleared", () => {
    setManualStatus(OS, "strong");
    expect(state(OS)).toMatchObject({ manualStatus: "strong", status: "strong" });
    expect(useConceptStateStore.getState().checks[OS]?.[0]).toMatchObject({
      kind: "manual",
      score: 1,
    });
    expect(state(OS)!.srs.dueAt).toBeDefined();
    setManualStatus(OS, null);
    expect(state(OS)!.manualStatus).toBeUndefined();
    // The manual check still counts as 0.8 knowledge: strong on evidence now.
    expect(state(OS)!.status).toBe("strong");
    setManualStatus(OS, "learning");
    expect(state(OS)!.status).toBe("learning");
  });

  it("fades a manual strong when overdue, unless never fade is on", () => {
    setManualStatus(OS, "strong");
    const later = new Date(Date.now() + 10 * 86_400_000);
    refreshConcepts([OS], { now: later });
    expect(state(OS)!.status).toBe("fading");
    expect(evaluateConcept(OS, later)!.toGreen.some((t) => t.startsWith("Review it"))).toBe(true);
    setNeverFade(OS, true);
    refreshConcepts([OS], { now: later });
    expect(state(OS)!.status).toBe("strong");
  });

  it("hides and shows a concept", () => {
    setHidden(OS, true);
    expect(state(OS)!.hidden).toBe(true);
    setHidden(OS, false);
    expect(state(OS)!.hidden).toBeUndefined();
  });
});

describe("custom concepts", () => {
  it("adds, finds, scores and deletes the owner's own concept", async () => {
    const id = addCustomConcept({
      topicId: "dsa.graph-basics",
      name: "Euler tours",
      scope: "",
      importance: "important",
    });
    expect(id.startsWith("custom.")).toBe(true);
    const concept = findConcept(id)!;
    expect(concept).toMatchObject({ name: "Euler tours", scope: "Euler tours", subjectId: "dsa" });
    markStudied(id);
    expect(state(id)!.status).toBe("learning");
    await repo.flush();
    expect(await repo.customConcepts.get(id)).toBeDefined();
    const removed = deleteCustomConcept(id)!;
    expect(findConcept(id)).toBeUndefined();
    restoreCustomConcept(removed);
    expect(findConcept(id)?.name).toBe("Euler tours");
  });
});

describe("notes, map positions and plan items", () => {
  it("autosaves notes and moves a saved answer into the body", async () => {
    setNoteMarkdown(OS, "My summary");
    flushNotes();
    await repo.flush();
    expect((await repo.conceptNotes.get(OS))?.markdown).toBe("My summary");
    useConceptNoteStore.setState({
      notes: {
        [OS]: {
          ...useConceptNoteStore.getState().notes[OS]!,
          savedAnswers: [
            { id: "a1", question: "Why?", answer: "Because.", createdAt: "", source: "copy" },
          ],
        },
      },
    });
    const before = moveAnswerIntoNote(OS, "a1");
    expect(before?.savedAnswers).toHaveLength(1);
    const note = useConceptNoteStore.getState().notes[OS]!;
    expect(note.savedAnswers).toHaveLength(0);
    expect(note.markdown).toBe("My summary\n\n### Why?\n\nBecause.\n");
    setNoteMarkdown(OS, "");
    flushNotes();
    await repo.flush();
    expect(await repo.conceptNotes.get(OS)).toBeUndefined();
  });

  it("saves dragged positions and resets them with undo", async () => {
    moveNode(OS, { x: 10.04, y: -3 });
    expect(useMapStore.getState().overrides[OS]).toEqual({ x: 10, y: -3 });
    const previous = resetLayout();
    expect(useMapStore.getState().overrides).toEqual({});
    restoreOverrides(previous);
    await repo.flush();
    expect(await repo.mapOverrides.get(OS)).toMatchObject({ x: 10, y: -3 });
  });

  it("adds plan items once and completes them from concept actions", async () => {
    const item = {
      kind: "learn-concept" as const,
      refId: OS,
      title: "Learn: Process vs program",
      reason: "Added from the map.",
      estMinutes: 25,
    };
    expect(addPlanItems([item])).toBe(1);
    expect(addPlanItems([item])).toBe(0);
    const plan = usePlanStore.getState().plans[today()]!;
    expect(plan.items).toHaveLength(1);
    markStudied(OS);
    await new Promise((r) => setTimeout(r, 0));
    await repo.flush();
    expect(usePlanStore.getState().plans[today()]!.items[0]!.done).toBe(true);
    setPlanItemDone(today(), plan.items[0]!.id, false);
    expect(usePlanStore.getState().plans[today()]!.items[0]!.done).toBe(false);
  });
});
