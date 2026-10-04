// ADHD mode's pure parts (F32, session 9.4): settings and the <html data-adhd> value, the steps
// per kind of plan item, the learned pace, the disc and its chimes, the 90-minute check-in, the
// if-then line and its clock time, Fresh start, Welcome back, reading parts and read-aloud text,
// and the focus sound's noise.
import { describe, expect, it } from "vitest";
import { afterBreak, addActivity, checkInDue, emptyStretch } from "@/lib/adhd/checkIn";
import {
  freshStartDates,
  lastActiveBefore,
  welcomeBackDue,
  type OverdueItem,
} from "@/lib/adhd/freshStart";
import { noiseLoop, NOISE_RMS, rms, roughness } from "@/lib/adhd/noise";
import {
  describePace,
  median,
  paceRatio,
  plannedTook,
  scaleMinutes,
  tookMinutes,
  withSample,
} from "@/lib/adhd/pace";
import {
  ADHD_PARTS,
  adhdAttribute,
  adhdOn,
  adhdPartOn,
  adhdSettings,
  cleanAdhdAttribute,
  nextAdhdPrefs,
} from "@/lib/adhd/prefs";
import {
  deepParts,
  interviewParts,
  levelParts,
  markdownBlocks,
  partQuestion,
  speechText,
  wordCount,
} from "@/lib/adhd/reading";
import {
  cleanWhen,
  clockInText,
  startLineSentence,
  startReminderDue,
  startWhenFor,
  startWhenIsToday,
} from "@/lib/adhd/startLine";
import { currentStep, newTicks, stepsFor, ticksOf, withTick } from "@/lib/adhd/steps";
import { cuesCrossed, discFraction, discText, timeCues } from "@/lib/adhd/time";
import { mulberry32 } from "@/lib/random";
import { addDaysToDate } from "@/lib/time";
import type { ActivityDay, AdhdPrefs, PaceSample, PlanItem } from "@/lib/types";

describe("ADHD settings", () => {
  it("are off with defaults until first turned on, and every part starts on", () => {
    const s = adhdSettings(undefined);
    expect(s).toMatchObject({
      on: false,
      blockMinutes: 15,
      breakMinutes: 5,
      sound: "off",
      studyWithClaude: false,
    });
    expect(Object.values(s.parts).every(Boolean)).toBe(true);
    expect(adhdOn(undefined)).toBe(false);
    expect(adhdPartOn(undefined, "calm")).toBe(false);
  });

  it("turn each part off on its own; the sound and Study with Claude stay off", () => {
    const adhd = nextAdhdPrefs(undefined, { on: true, place: false });
    expect(adhd.sound).toBe("off");
    expect(adhd.studyWithClaude).toBe(false);
    const prefs = { adhd };
    expect(adhdPartOn(prefs, "place")).toBe(false);
    for (const part of ADHD_PARTS.filter((p) => p !== "place")) {
      expect(adhdPartOn(prefs, part), part).toBe(true);
    }
    expect(adhdSettings(prefs).parts.place).toBe(false);
    // Turning the mode off keeps the choices for next time.
    const off = nextAdhdPrefs(adhd, { on: false });
    expect(adhdPartOn({ adhd: off }, "calm")).toBe(false);
    expect(off.place).toBe(false);
  });

  it("name the parts that are on in <html data-adhd>, and read back only known names", () => {
    expect(adhdAttribute(undefined)).toBeNull();
    const adhd: AdhdPrefs = nextAdhdPrefs(undefined, { on: true, gentle: false, reading: false });
    expect(adhdAttribute({ adhd })).toBe("calm nowCard time place rewards breaks startHelp");
    expect(adhdAttribute({ adhd: { ...adhd, on: false } })).toBeNull();
    expect(cleanAdhdAttribute("calm bogus  time")).toBe("calm time");
    expect(cleanAdhdAttribute("")).toBe("");
    expect(cleanAdhdAttribute(null)).toBeNull();
  });
});

describe("steps per kind", () => {
  const item = (kind: PlanItem["kind"], refIds?: string[]) => ({ kind, refIds });
  it("follow F32 for re-solves, new problems and learning", () => {
    expect(stepsFor(item("resolve"))).toEqual([
      "Read the problem again",
      "Say your approach in one line",
      "Write the code",
      "Test with three inputs",
      "Save the attempt",
    ]);
    expect(stepsFor(item("new-problem"))).toEqual([
      "Read it",
      "Name the pattern",
      "Plan",
      "Code",
      "Test",
      "Save",
    ]);
    expect(stepsFor(item("learn-concept"))).toEqual([
      "Read Simple",
      "Read Interview",
      "One quick check",
      "Mark as studied",
    ]);
  });

  it("give a flashcard round a step per concept, and the practice kinds three or four", () => {
    expect(stepsFor(item("review-concept", ["a", "b", "c"]), (id) => id.toUpperCase())).toEqual([
      "Cards: A",
      "Cards: B",
      "Cards: C",
    ]);
    expect(stepsFor(item("review-concept", ["a"]))).toHaveLength(3);
    for (const kind of ["mock", "design", "story", "drill", "mental-math"] as const) {
      expect(stepsFor(item(kind)).length, kind).toBeGreaterThanOrEqual(3);
      expect(stepsFor(item(kind)).length, kind).toBeLessThanOrEqual(4);
    }
    expect(stepsFor(item("thought"))).toEqual([]);
  });

  it("keep ticks per step, find the current one and count new ticks", () => {
    const ticks = ticksOf({ steps: [true, false, true, true, true, true] }, 5);
    expect(ticks).toEqual([true, false, true, true, true]);
    expect(currentStep(ticks)).toBe(1);
    const next = withTick(ticks, 1, true);
    expect(currentStep(next)).toBe(-1);
    expect(newTicks(ticks, next)).toBe(1);
    expect(newTicks(next, withTick(next, 0, false))).toBe(0);
    expect(ticksOf({}, 3)).toEqual([false, false, false]);
  });
});

describe("pace", () => {
  const sample = (n: number, planned: number, took: number): PaceSample => ({
    id: `d:${n}`,
    planned,
    took,
    at: `2026-09-${String(10 + (n % 20)).padStart(2, "0")}T10:${String(n % 60).padStart(2, "0")}:00.000Z`,
  });

  it("is the median ratio once three items are timed, kept within 0.5 to 3", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(paceRatio([sample(1, 15, 22), sample(2, 15, 30)])).toBeNull();
    expect(paceRatio([sample(1, 10, 15), sample(2, 10, 12), sample(3, 10, 20)])).toBeCloseTo(1.5);
    expect(paceRatio([sample(1, 10, 100), sample(2, 10, 90), sample(3, 10, 80)])).toBe(3);
    expect(paceRatio([sample(1, 10, 1), sample(2, 10, 2), sample(3, 10, 1)])).toBe(0.5);
  });

  it("scales estimates, describes itself plainly and keeps the newest 20 samples", () => {
    expect(scaleMinutes(15, 1.47)).toBe(22);
    expect(scaleMinutes(15, null)).toBe(15);
    expect(tookMinutes(10_000)).toBe(1);
    expect(tookMinutes(22.4 * 60_000)).toBe(22);
    expect(describePace(1.04)).toBe("about the time planned");
    expect(describePace(1.43)).toBe("about 1.4 times the plan");
    expect(plannedTook(15, 22)).toBe("Planned 15, took 22");
    let stat = withSample(undefined, "resolve", sample(0, 15, 20), "t");
    for (let n = 1; n < 25; n++) stat = withSample(stat, "resolve", sample(n, 15, 20 + n), "t");
    expect(stat.samples).toHaveLength(20);
    // The same item again replaces its sample instead of counting twice.
    const again = withSample(stat, "resolve", { ...stat.samples[19]!, took: 99 }, "t2");
    expect(again.samples).toHaveLength(20);
    expect(again.samples.filter((s) => s.took === 99)).toHaveLength(1);
  });
});

describe("the disc and its chimes", () => {
  it("shrinks in 5-second steps and says how far over it is without alarm", () => {
    expect(discFraction(0, 60_000)).toBe(1);
    expect(discFraction(4_999, 60_000)).toBe(1);
    expect(discFraction(30_000, 60_000)).toBe(0.5);
    expect(discFraction(90_000, 60_000)).toBe(0);
    expect(discText(4 * 60_000, 15 * 60_000)).toEqual({
      main: "11:00",
      sub: "left of 15",
      label: "11 minutes left of 15",
    });
    expect(discText(15 * 60_000 + 10_000, 15 * 60_000).sub).toBe("time's up");
    expect(discText(22 * 60_000, 15 * 60_000)).toMatchObject({ main: "+7", sub: "min over 15" });
  });

  it("chime at half time and at 2 minutes left, once each", () => {
    expect(timeCues(15 * 60_000)).toEqual([7.5 * 60_000, 13 * 60_000]);
    // A 2-minute drill prompt: only half time (2 minutes left is its start).
    expect(timeCues(2 * 60_000)).toEqual([60_000]);
    expect(timeCues(4 * 60_000)).toEqual([2 * 60_000]);
    const cues = timeCues(15 * 60_000);
    expect(cuesCrossed(0, 7 * 60_000, cues)).toEqual([]);
    expect(cuesCrossed(7 * 60_000, 8 * 60_000, cues)).toEqual([7.5 * 60_000]);
    expect(cuesCrossed(8 * 60_000, 14 * 60_000, cues)).toEqual([13 * 60_000]);
  });
});

describe("the 90-minute check-in", () => {
  const MIN = 60_000;
  const BREAK = 5 * MIN;
  it("comes after 90 minutes of activity without a break, at most once per 90 minutes", () => {
    let s = emptyStretch(0);
    let now = 0;
    for (let i = 0; i < 89; i++) {
      now += MIN;
      s = addActivity(s, MIN, now, BREAK);
    }
    expect(checkInDue(s, now, BREAK)).toBe(false);
    now += MIN;
    s = addActivity(s, MIN, now, BREAK);
    expect(checkInDue(s, now, BREAK)).toBe(true);
    s = { ...s, shownAt: now };
    for (let i = 0; i < 89; i++) {
      now += MIN;
      s = addActivity(s, MIN, now, BREAK);
    }
    expect(checkInDue(s, now, BREAK)).toBe(false);
    now += MIN;
    s = addActivity(s, MIN, now, BREAK);
    expect(checkInDue(s, now, BREAK)).toBe(true);
  });

  it("starts again after a pause as long as a break, or after a focus break", () => {
    let s = emptyStretch(0);
    let now = 0;
    for (let i = 0; i < 80; i++) {
      now += MIN;
      s = addActivity(s, MIN, now, BREAK);
    }
    now += 6 * MIN; // away for six minutes
    s = addActivity(s, MIN, now, BREAK);
    expect(s.ms).toBe(MIN);
    s = afterBreak({ ...s, ms: 95 * MIN }, now);
    expect(checkInDue(s, now, BREAK)).toBe(false);
    // Nothing running for a while: no check-in, whatever the stretch held.
    expect(checkInDue({ ms: 120 * MIN, lastAt: 0 }, 10 * MIN, BREAK)).toBe(false);
  });
});

describe("the if-then line", () => {
  it("finds a clock time in what the owner wrote", () => {
    const cases: [string, number | null][] = [
      ["I finish dinner", null],
      ["it's 7 pm", 19 * 60],
      ["7pm", 19 * 60],
      ["7:30 pm", 19 * 60 + 30],
      ["at 7.30 p.m.", 19 * 60 + 30],
      ["12 am", 0],
      ["12:15 pm", 12 * 60 + 15],
      ["it's 19:30", 19 * 60 + 30],
      ["06:05", 6 * 60 + 5],
      ["noon", 12 * 60],
      ["midnight", 0],
      ["at 7", null],
      ["7 amazing things", null],
      ["13 pm", null],
    ];
    for (const [text, minute] of cases) expect(clockInText(text), text).toBe(minute);
  });

  it("is due from its time for an hour", () => {
    const at = (h: number, m: number) => new Date(2026, 9, 4, h, m);
    expect(startReminderDue("it's 7 pm", at(18, 59))).toBe(false);
    expect(startReminderDue("it's 7 pm", at(19, 0))).toBe(true);
    expect(startReminderDue("it's 7 pm", at(19, 59))).toBe(true);
    expect(startReminderDue("it's 7 pm", at(20, 0))).toBe(false);
    expect(startReminderDue("I finish dinner", at(19, 0))).toBe(false);
  });

  it("keeps a line for the day or as a default, and reads as one sentence", () => {
    const adhd = { startWhen: "I finish dinner", startWhenDay: { date: "2026-10-04", text: "7 pm" } };
    expect(startWhenFor(adhd, "2026-10-04")).toBe("7 pm");
    expect(startWhenIsToday(adhd, "2026-10-04")).toBe(true);
    expect(startWhenFor(adhd, "2026-10-05")).toBe("I finish dinner");
    expect(startWhenIsToday(adhd, "2026-10-05")).toBe(false);
    expect(startWhenFor(undefined, "2026-10-05")).toBe("");
    expect(cleanWhen("  When I  finish dinner. ")).toBe("I finish dinner");
    expect(startLineSentence("I finish dinner")).toBe(
      "When I finish dinner, I'll start the first stop.",
    );
  });
});

describe("Fresh start and Welcome back", () => {
  it("spread the overdue items over 7 days from today, most urgent first", () => {
    const items: OverdueItem[] = Array.from({ length: 35 }, (_, i) => ({
      key: `problem:${i}`,
      dueAt: addDaysToDate("2026-10-04", -(40 - i)),
    }));
    const dates = freshStartDates(items, "2026-10-04");
    const days = items.map((i) => dates.get(i.key)!);
    expect(days[0]).toBe("2026-10-04");
    expect(days[34]).toBe("2026-10-10");
    // Order kept: never an earlier day for a later item.
    for (let i = 1; i < days.length; i++) expect(days[i]! >= days[i - 1]!).toBe(true);
    const perDay = new Map<string, number>();
    for (const d of days) perDay.set(d, (perDay.get(d) ?? 0) + 1);
    expect([...perDay.values()]).toEqual([5, 5, 5, 5, 5, 5, 5]);
    const uneven = freshStartDates(items.slice(0, 31), "2026-10-04");
    const counts = new Map<string, number>();
    for (const d of uneven.values()) counts.set(d, (counts.get(d) ?? 0) + 1);
    expect(counts.size).toBe(7);
    expect(Math.max(...counts.values()) - Math.min(...counts.values())).toBeLessThanOrEqual(1);
  });

  it("welcome the owner back after 3 days or more away, never on a first day", () => {
    const day = (minutes: number): ActivityDay => ({
      minutes,
      problemsSolved: 0,
      reviews: 0,
      conceptsTouched: 0,
    });
    const days: Record<string, ActivityDay> = {
      "2026-09-28": day(40),
      "2026-09-30": day(5), // not an active day
      "2026-10-01": day(30),
    };
    const lookup = (d: string) => days[d];
    expect(lastActiveBefore(lookup, "2026-10-04")).toBe("2026-10-01");
    expect(welcomeBackDue(lookup, "2026-10-03")).toBe(false);
    expect(welcomeBackDue(lookup, "2026-10-04")).toBe(true);
    expect(welcomeBackDue(() => undefined, "2026-10-04")).toBe(false);
  });
});

describe("reading one part at a time", () => {
  it("keeps Simple whole and groups interview points by up to three", () => {
    expect(levelParts("simple", { simple: "A queue.", interview: [] })).toEqual([
      { markdown: "A queue." },
    ]);
    const sizes = (n: number) =>
      interviewParts(Array.from({ length: n }, (_, i) => `point ${i}`)).map(
        (p) => p.markdown.split("\n").length,
      );
    expect(sizes(3)).toEqual([3]);
    expect(sizes(4)).toEqual([2, 2]);
    expect(sizes(5)).toEqual([3, 2]);
    expect(sizes(7)).toEqual([3, 2, 2]);
  });

  it("splits a Deep article at its sub-headings without cutting code", () => {
    const deep = [
      "An intro paragraph.",
      "",
      "#### How it works",
      "",
      "Step one.",
      "",
      "```cpp",
      "int main() {",
      "",
      "#### not a heading inside code",
      "  return 0;",
      "}",
      "```",
      "",
      "#### Pitfalls",
      "",
      "| a | b |",
      "|---|---|",
      "| 1 | 2 |",
    ].join("\n");
    const parts = deepParts(deep);
    expect(parts.map((p) => p.title)).toEqual([undefined, "How it works", "Pitfalls"]);
    expect(parts[1]!.markdown).toContain("#### not a heading inside code");
    expect(parts[1]!.markdown).toMatch(/```cpp[\s\S]*```$/);
    expect(markdownBlocks(deep)).toHaveLength(6);
  });

  it("splits a long stretch without headings at paragraph breaks", () => {
    const para = (n: number) => Array.from({ length: 100 }, (_, i) => `w${n}x${i}`).join(" ");
    const parts = deepParts([para(1), para(2), para(3), para(4), para(5)].join("\n\n"));
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => wordCount(p.markdown) <= 250)).toBe(true);
    expect(parts.map((p) => p.markdown).join("\n\n")).toBe(
      [para(1), para(2), para(3), para(4), para(5)].join("\n\n"),
    );
  });

  it("follows each part with a different question", () => {
    const qs = ["a", "b", "c"].map((q) => ({ q, a: q }));
    expect(partQuestion(qs, "simple", 0)!.q).toBe("a");
    expect(partQuestion(qs, "interview", 0)!.q).toBe("b");
    expect(partQuestion(qs, "interview", 1)!.q).toBe("c");
    expect(partQuestion(qs, "deep", 1)!.q).toBe("a");
    expect(partQuestion([], "deep", 0)).toBeUndefined();
  });

  it("reads plain sentences aloud, naming code and tables instead of reading them", () => {
    const text = speechText(
      [
        "A **stack** is last in, first out; see [queues](#/concept/x).",
        "",
        "- Push is $O(1)$",
        "- `pop` removes the top",
        "",
        "```cpp",
        "std::stack<int> s;",
        "```",
        "",
        "| op | cost |",
        "|---|---|",
        "| push | O(1) |",
      ].join("\n"),
    );
    expect(text).toBe(
      "A stack is last in, first out; see queues. Push is O(1). pop removes the top. There is a code example here. There is a table here.",
    );
  });
});

describe("focus sound", () => {
  const RATE = 8_000;
  it("is the same for the same seed and equally loud in every color", () => {
    const a = noiseLoop("pink", RATE, mulberry32(7), 2);
    const b = noiseLoop("pink", RATE, mulberry32(7), 2);
    expect(a).toEqual(b);
    for (const color of ["white", "pink", "brown"] as const) {
      const loop = noiseLoop(color, RATE, mulberry32(3), 2);
      expect(loop).toHaveLength(2 * RATE);
      expect(rms(loop)).toBeCloseTo(NOISE_RMS, 2);
      expect(Math.max(...loop.map(Math.abs))).toBeLessThanOrEqual(1);
    }
  });

  it("falls toward low sounds from white to pink to brown", () => {
    const r = (c: "white" | "pink" | "brown") => roughness(noiseLoop(c, RATE, mulberry32(11), 2));
    expect(r("white")).toBeGreaterThan(r("pink"));
    expect(r("pink")).toBeGreaterThan(r("brown"));
    expect(r("white")).toBeGreaterThan(1.5);
    expect(r("brown")).toBeLessThan(0.05);
  });

  it("loops without a click: the step at the seam is like any other step", () => {
    const loop = noiseLoop("brown", RATE, mulberry32(5), 2);
    const steps: number[] = [];
    for (let i = 1; i < loop.length; i++) steps.push(Math.abs(loop[i]! - loop[i - 1]!));
    const seam = Math.abs(loop[0]! - loop[loop.length - 1]!);
    const sorted = [...steps].sort((x, y) => x - y);
    expect(seam).toBeLessThanOrEqual(sorted[Math.floor(sorted.length * 0.999)]!);
  });
});
