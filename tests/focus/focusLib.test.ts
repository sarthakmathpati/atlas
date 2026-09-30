// The focus layer's pure parts (F31): the horizon line's steps and dots, when a parked thought
// comes back, the wrap-up window, interview day, the breathing rhythm, break prompts, block
// lines and the memory walk. Times are local (the tests build them with local constructors).
import { describe, expect, it } from "vitest";
import { layout } from "@/data/layout";
import { concepts, conceptsByTopic } from "@/data/syllabus";
import { minutesUntilBedtime, wrapUpDue, wrapUpNight } from "@/lib/focus/bedtime";
import { BREATHING_MS, breathingAt } from "@/lib/focus/breathing";
import {
  dottedFromMs,
  horizonDotted,
  horizonFraction,
  horizonRemainingMs,
} from "@/lib/focus/horizon";
import { cleanIntention, inlineIntention, intentionForItem } from "@/lib/focus/intention";
import { interviewDay } from "@/lib/focus/interviewDay";
import {
  breakThoughts,
  dayAfterSleep,
  morningTime,
  parkDueAt,
  thoughtsBack,
  thoughtsWaiting,
  tonightThoughts,
  tonightTime,
} from "@/lib/focus/park";
import { DEFAULT_FOCUS_PREFS, focusPrefs } from "@/lib/focus/prefs";
import { BREAK_PROMPTS, breakPrompt } from "@/lib/focus/prompts";
import { memoryWalk, walkDeckOrder, walkLength } from "@/lib/focus/walk";
import type { ParkedThought } from "@/lib/types";

const MIN = 60_000;

describe("the horizon line", () => {
  const block = 25 * MIN;

  it("shrinks from full width to nothing in 5-second steps", () => {
    expect(horizonFraction(0, block)).toBe(1);
    expect(horizonFraction(4_999, block)).toBe(1);
    expect(horizonFraction(5_000, block)).toBeCloseTo(1 - 5_000 / block, 10);
    expect(horizonFraction(12 * MIN + 2_000, block)).toBeCloseTo(13 / 25, 10);
    expect(horizonFraction(block, block)).toBe(0);
    expect(horizonFraction(block + MIN, block)).toBe(0);
    // Every value between two steps is the same, so nothing moves in between.
    const seen = new Set<number>();
    for (let t = 60_000; t < 65_000; t += 250) seen.add(horizonFraction(t, block));
    expect(seen.size).toBe(1);
  });

  it("turns dotted in the last 2 minutes of a block", () => {
    expect(dottedFromMs(block)).toBe(2 * MIN);
    expect(horizonDotted(22 * MIN + 55_000, block)).toBe(false);
    expect(horizonDotted(23 * MIN, block)).toBe(true);
    expect(horizonDotted(24 * MIN + 59_000, block)).toBe(true);
    // Time is up: nothing is left to draw.
    expect(horizonDotted(block, block)).toBe(false);
    expect(horizonRemainingMs(block - 1, block)).toBe(5_000);
  });

  it("uses the last quarter for short rounds (a 2-minute drill prompt)", () => {
    const drill = 2 * MIN;
    expect(dottedFromMs(drill)).toBe(30_000);
    expect(horizonDotted(85_000, drill)).toBe(false);
    expect(horizonDotted(90_000, drill)).toBe(true);
  });
});

const thought = (t: Partial<ParkedThought> & Pick<ParkedThought, "id">): ParkedThought => ({
  text: "A thought",
  when: "break",
  dueAt: "2026-09-27T10:00:00.000Z",
  createdAt: "2026-09-27T09:00:00.000Z",
  updatedAt: "2026-09-27T09:00:00.000Z",
  ...t,
});

describe("Park it", () => {
  const ctx = (now: Date, blockEndsAt: number | null = null) => ({
    now,
    blockEndsAt,
    focusMinutes: 25,
    tonight: "19:00",
    morning: "06:30",
  });

  it("brings a break thought back when the running block ends, or after one block's length", () => {
    const now = new Date(2026, 8, 27, 14, 0);
    const ends = new Date(2026, 8, 27, 14, 16).getTime();
    expect(parkDueAt("break", ctx(now, ends)).getTime()).toBe(ends);
    expect(parkDueAt("break", ctx(now)).getTime()).toBe(now.getTime() + 25 * MIN);
  });

  it("brings a tonight thought back at the evening time, or in an hour when that has passed", () => {
    expect(parkDueAt("tonight", ctx(new Date(2026, 8, 27, 14, 0)))).toEqual(
      new Date(2026, 8, 27, 19, 0),
    );
    const late = new Date(2026, 8, 27, 21, 10);
    expect(parkDueAt("tonight", ctx(late))).toEqual(new Date(2026, 8, 27, 22, 10));
  });

  it("brings a tomorrow thought back the next morning, even after midnight", () => {
    expect(parkDueAt("tomorrow", ctx(new Date(2026, 8, 27, 14, 0)))).toEqual(
      new Date(2026, 8, 28, 6, 30),
    );
    // At 00:40 the next morning is the same date.
    expect(parkDueAt("tomorrow", ctx(new Date(2026, 8, 28, 0, 40)))).toEqual(
      new Date(2026, 8, 28, 6, 30),
    );
  });

  it("uses the Dusk and Day start times with By time of day, else 19:00 and 06:30", () => {
    const schedule = { day: "07:15", dusk: "18:20", night: "22:00" };
    expect(tonightTime("schedule", schedule)).toBe("18:20");
    expect(morningTime("schedule", schedule)).toBe("07:15");
    expect(tonightTime("night", schedule)).toBe("19:00");
    expect(morningTime("system", schedule)).toBe("06:30");
  });

  it("lists thoughts whose time came, those waiting, those for the break and for tonight", () => {
    const now = new Date("2026-09-27T12:00:00.000Z");
    const list = [
      thought({ id: "a", dueAt: "2026-09-27T11:00:00.000Z" }),
      thought({ id: "b", dueAt: "2026-09-27T13:00:00.000Z", when: "tonight" }),
      thought({ id: "c", dueAt: "2026-09-27T10:00:00.000Z", doneAt: "2026-09-27T11:00:00.000Z" }),
      thought({ id: "d", dueAt: "2026-09-27T09:00:00.000Z", when: "tomorrow" }),
    ];
    expect(thoughtsBack(list, now).map((t) => t.id)).toEqual(["d", "a"]);
    expect(thoughtsWaiting(list, now).map((t) => t.id)).toEqual(["b"]);
    expect(breakThoughts(list).map((t) => t.id)).toEqual(["a"]);
    expect(tonightThoughts(list).map((t) => t.id)).toEqual(["b"]);
  });

  it("plans tomorrow for the day after sleep, also after midnight", () => {
    expect(dayAfterSleep(new Date(2026, 8, 27, 22, 30))).toBe("2026-09-28");
    expect(dayAfterSleep(new Date(2026, 8, 28, 0, 30))).toBe("2026-09-28");
  });
});

describe("the wrap-up note", () => {
  it("shows during the 30 minutes before bedtime, and not without a bedtime", () => {
    const at = (h: number, m: number) => new Date(2026, 8, 27, h, m);
    expect(wrapUpDue(undefined, at(22, 45))).toBe(false);
    expect(wrapUpDue("23:00", at(22, 29))).toBe(false);
    expect(wrapUpDue("23:00", at(22, 30))).toBe(true);
    expect(wrapUpDue("23:00", at(22, 59))).toBe(true);
    expect(wrapUpDue("23:00", at(23, 0))).toBe(false);
    expect(minutesUntilBedtime("23:00", at(22, 40))).toBe(20);
  });

  it("works across midnight and knows which night it belongs to", () => {
    const at = (d: number, h: number, m: number) => new Date(2026, 8, d, h, m);
    expect(wrapUpDue("00:15", at(27, 23, 50))).toBe(true);
    expect(wrapUpNight("00:15", at(27, 23, 50))).toBe("2026-09-28");
    expect(wrapUpNight("23:00", at(27, 22, 40))).toBe("2026-09-27");
    expect(wrapUpNight(undefined, at(27, 22, 40))).toBeNull();
  });
});

describe("interview day", () => {
  it("is the interview date and the day before", () => {
    expect(interviewDay("2026-10-04", "2026-10-04")).toBe("today");
    expect(interviewDay("2026-10-03", "2026-10-04")).toBe("tomorrow");
    expect(interviewDay("2026-10-02", "2026-10-04")).toBeNull();
    expect(interviewDay("2026-10-05", "2026-10-04")).toBeNull();
    expect(interviewDay("2026-10-04", undefined)).toBeNull();
  });
});

describe("breathing for a minute", () => {
  it("grows for 5 seconds and shrinks for 5, six times", () => {
    expect(BREATHING_MS).toBe(60_000);
    expect(breathingAt(0)).toEqual({ done: false, breath: 1, phase: "in", second: 1 });
    expect(breathingAt(4_999)).toMatchObject({ breath: 1, phase: "in", second: 5 });
    expect(breathingAt(5_000)).toMatchObject({ breath: 1, phase: "out", second: 1 });
    expect(breathingAt(10_000)).toMatchObject({ breath: 2, phase: "in", second: 1 });
    expect(breathingAt(59_999)).toMatchObject({ done: false, breath: 6, phase: "out" });
    expect(breathingAt(60_000).done).toBe(true);
  });
});

describe("break prompts", () => {
  it("move on to the next idea after each block of the day", () => {
    const first = breakPrompt("2026-09-27", 0);
    const second = breakPrompt("2026-09-27", 1);
    expect(BREAK_PROMPTS).toContain(first);
    expect(second).not.toBe(first);
    const i = BREAK_PROMPTS.indexOf(first);
    expect(second).toBe(BREAK_PROMPTS[(i + 1) % BREAK_PROMPTS.length]);
    for (const p of BREAK_PROMPTS) expect(p).not.toMatch(/!/);
  });
});

describe("a block's line", () => {
  it("is written from the plan item", () => {
    const item = (kind: Parameters<typeof intentionForItem>[0]["kind"], title: string) =>
      intentionForItem({ kind, title });
    expect(item("resolve", "Re-solve: 69. Sqrt(x)")).toBe("Re-solve 69. Sqrt(x)");
    expect(item("new-problem", "New problem: 1. Two Sum")).toBe("Solve 1. Two Sum");
    expect(item("learn-concept", "Learn: Paging")).toBe("Learn Paging");
    expect(item("review-concept", "Flashcards: Paging, TLB")).toBe(
      "Review Paging, TLB with flashcards",
    );
    expect(item("review-concept", "Review: Paging")).toBe("Review Paging");
    expect(item("mock", "Mock interview: coding")).toBe("Do a coding mock interview");
    expect(item("thought", "Email the recruiter")).toBe("Email the recruiter");
  });

  it("reads inside a sentence without changing names", () => {
    expect(inlineIntention("Re-solve 69. Sqrt(x)")).toBe("re-solve 69. Sqrt(x)");
    expect(inlineIntention("TCP handshakes")).toBe("TCP handshakes");
    expect(cleanIntention("  Learn   paging \n")).toBe("Learn paging");
    expect(cleanIntention("x".repeat(300))).toHaveLength(140);
  });
});

describe("focus settings", () => {
  it("default every part to on, and keep the owner's choices", () => {
    expect(focusPrefs(undefined)).toEqual(DEFAULT_FOCUS_PREFS);
    expect(focusPrefs({ focus: { dim: false } })).toEqual({ ...DEFAULT_FOCUS_PREFS, dim: false });
  });
});

describe("the memory walk", () => {
  const places: Record<string, { x: number; y: number }> = {
    a: { x: 0, y: 0 },
    b: { x: 10, y: 0 },
    c: { x: 1, y: 0 },
    d: { x: 11, y: 1 },
    e: { x: 2, y: 5 },
  };
  const placeOf = (id: string) => places[id];

  it("goes to the nearest place not yet visited, from the start", () => {
    expect(memoryWalk(["a", "b", "c", "d", "e"], placeOf, "a")).toEqual(["a", "c", "e", "b", "d"]);
    expect(memoryWalk(["a", "b", "c", "d", "e"], placeOf, "d")).toEqual(["d", "b", "c", "a", "e"]);
  });

  it("puts concepts without a place last and keeps ties in the given order", () => {
    expect(memoryWalk(["x", "a", "y", "c"], placeOf, "a")).toEqual(["a", "c", "x", "y"]);
    const tie = { p: { x: 0, y: 0 }, q: { x: 1, y: 0 }, r: { x: -1, y: 0 } };
    expect(memoryWalk(["p", "r", "q"], (id) => tie[id as keyof typeof tie], "p")).toEqual([
      "p",
      "r",
      "q",
    ]);
  });

  it("changes only the order of the concepts a session reaches", () => {
    const order = walkDeckOrder(["b", "a", "e", "c", "d"], placeOf, (id) => "abcde".indexOf(id), 3);
    // The first three (b, a, e) are walked from "a", the syllabus's first; c and d stay after.
    expect(order).toEqual(["a", "e", "b", "c", "d"]);
  });

  it("walks a real topic from its first concept, along a shorter route than topic order", () => {
    const topic = conceptsByTopic.get("os.memory")!;
    const ids = topic.map((c) => c.id);
    const index = new Map(concepts.map((c, i) => [c.id, i]));
    const place = (id: string) => layout.positions[id];
    const route = walkDeckOrder(ids, place, (id) => index.get(id)!, ids.length);
    expect(route[0]).toBe(ids[0]);
    expect([...route].sort()).toEqual([...ids].sort());
    expect(walkLength(route, place)).toBeLessThan(walkLength(ids, place));
  });
});
