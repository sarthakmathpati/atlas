// Revision sheets (F19): built fully offline from the owner's data, with the mistake checklist,
// the right concepts, patterns and insights for each scope, a page break per subject in the
// 1-week sheet, exports that stand alone, and what "Tighten with Claude" sends.
import { beforeAll, describe, expect, it } from "vitest";
import { conceptContentNow, loadSubjectContent } from "@/data/content";
import { conceptById, subjects } from "@/data/syllabus";
import { checklistTags, taggedAttempts } from "@/lib/mistakes/stats";
import { evaluateReadiness } from "@/lib/readiness/evaluate";
import type { ReadinessModel } from "@/lib/readiness/model";
import { sheetHtml } from "@/lib/revision/html";
import {
  buildSheet,
  countWords,
  DAY_LIMITS,
  sheetMarkdown,
  subjectsNeeded,
  tightenInput,
  tightenTarget,
  withoutTitle,
  type RevisionSheet,
  type SheetSources,
} from "@/lib/revision/sheet";
import { isTricky } from "@/lib/srs/problem";
import type { Profile } from "@/lib/types";
import { DAY, noonOf, records, scenario, type ScenarioName } from "../fixtures/scenarios";

function sources(name: ScenarioName, profile: Partial<Profile> = {}): SheetSources {
  const data = scenario(name);
  const r = records(data);
  const p = { ...r.profile, ...profile };
  const model = evaluateReadiness({
    ...r,
    profile: p,
    today: DAY,
    now: noonOf(DAY),
    intensity: "normal",
  });
  return {
    today: DAY,
    track: p.track,
    model,
    problemStates: r.problemStates,
    checklist: checklistTags(taggedAttempts(r.problemStates), data.mistakeTags, DAY),
    contentOf: (c) => conceptContentNow(c),
  };
}

let mid: SheetSources;
let day: RevisionSheet;
let week: RevisionSheet;

beforeAll(async () => {
  // The concept text first: sheets read interview points, signals and templates from it.
  await Promise.all(subjects.map((s) => loadSubjectContent(s.id)));
  mid = sources("mid");
  day = buildSheet({ scope: "day" }, mid);
  week = buildSheet({ scope: "week" }, mid);
});

describe("the 1-day sheet", () => {
  it("opens with the pre-interview mistake checklist", () => {
    expect(day.sections[0]!.id).toBe("mistakes");
    expect(mid.checklist.length).toBeGreaterThan(0);
    for (const c of mid.checklist) {
      expect(day.sections[0]!.markdown).toContain(`**${c.tag.label}**`);
      if (c.tag.howToAvoid) expect(day.sections[0]!.markdown).toContain(c.tag.howToAvoid);
    }
  });

  it("lists insights only from starred and tricky problems", () => {
    const section = day.sections.find((s) => s.id === "insights")!.markdown;
    const lines = section.split("\n").filter((l) => l.startsWith("- **"));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(DAY_LIMITS.insights);
    for (const state of Object.values(mid.problemStates)) {
      if (!state.insight || state.starred || isTricky(state.srs)) continue;
      expect(lines.some((l) => l.startsWith(`- **${state.problemId.slice(3)}. `))).toBe(false);
    }
  });

  it("gives interview bullets for fading and weak must-know concepts, fading first", () => {
    const section = day.sections.find((s) => s.id === "weak")!.markdown;
    const heads = [...section.matchAll(/^#### (.+) \((fading|learning)\)$/gm)];
    expect(heads.length).toBeGreaterThan(0);
    expect(heads.length).toBeLessThanOrEqual(DAY_LIMITS.concepts);
    const statuses = heads.map((h) => h[2]);
    const firstLearning = statuses.indexOf("learning");
    if (firstLearning >= 0) expect(statuses.lastIndexOf("fading")).toBeLessThan(firstLearning);
    for (const h of heads) {
      const concept = [...conceptById.values()].find((c) => c.name === h[1]);
      expect(concept?.importance).toBe("must");
    }
    // Bullets come from the written interview points (at most 3 per concept).
    const blocks = section.split(/^#### /m).slice(1);
    for (const b of blocks) {
      const bullets = b.split("\n").filter((l) => l.startsWith("- "));
      expect(bullets.length).toBeGreaterThan(0);
      expect(bullets.length).toBeLessThanOrEqual(DAY_LIMITS.bullets);
    }
    expect(day.counts.concepts).toBe(heads.length);
  });

  it("has formulas only for the Quant and Both tracks", () => {
    expect(day.sections.some((s) => s.id === "formulas")).toBe(false);
    const quant = sources("mid", { track: "both" });
    const byId = quant.model.byId as Map<
      string,
      ReturnType<ReadinessModel["byId"]["get"]> & object
    >;
    for (const id of [
      "prob.foundations.conditional-probability",
      "prob.random-variables.linearity-of-expectation",
      "prob.foundations.bayes-theorem",
    ]) {
      const e = byId.get(id);
      if (e) byId.set(id, { ...e, status: "learning", score: 20 });
    }
    const q = buildSheet({ scope: "day" }, quant);
    const formulas = q.sections.find((s) => s.id === "formulas")!.markdown;
    expect(q.counts.formulas).toBeGreaterThan(0);
    expect(formulas).toMatch(/\$/);
  });

  it("stays short, about two printed pages", () => {
    expect(day.words).toBe(countWords(day.sections.map((s) => s.markdown).join("\n\n")));
    expect(day.words).toBeLessThan(1200);
    expect(sheetMarkdown(day).startsWith("# 1-day revision sheet")).toBe(true);
  });

  it("builds for a new owner too, with friendly empty text", () => {
    const all = sheetMarkdown(buildSheet({ scope: "day" }, sources("new")));
    expect(all).toContain("No mistakes tagged yet.");
    expect(all).toContain("No starred or tricky problems with an insight yet.");
  });
});

describe("the 1-week sheet", () => {
  it("puts the checklist first, then one section per subject, each on a new page", () => {
    expect(week.sections[0]!.id).toBe("mistakes");
    expect(week.sections[0]!.newPage).toBe(false);
    const rest = week.sections.slice(1);
    expect(rest.length).toBeGreaterThan(1);
    const order = rest.map((s) => subjects.find((x) => `subject-${x.id}` === s.id)!.order);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    for (const s of rest) expect(s.newPage).toBe(true);
  });

  it("has every pattern in the track with its signals and template", () => {
    const dsa = week.sections.find((s) => s.id === "subject-dsa")!.markdown;
    const patterns = [...mid.model.byId.values()].filter((e) => e.concept.isPattern);
    expect(week.counts.patterns).toBe(patterns.length);
    for (const e of patterns) expect(dsa).toContain(`#### ${e.concept.name}`);
    expect((dsa.match(/```cpp/g) ?? []).length).toBe(patterns.length);
    expect((dsa.match(/^Signals:$/gm) ?? []).length).toBe(patterns.length);
  });

  it("covers every learning and fading must-know concept that isn't a pattern", () => {
    const md = sheetMarkdown(week);
    const expected = [...mid.model.byId.values()].filter(
      (e) =>
        e.concept.importance === "must" &&
        !e.concept.isPattern &&
        (e.status === "learning" || e.status === "fading"),
    );
    expect(expected.length).toBeGreaterThan(0);
    for (const e of expected) expect(md).toContain(`#### ${e.concept.name} (${e.status})`);
    expect(week.counts.concepts).toBe(expected.length);
  });

  it("lists the insight of every solved problem once, grouped by pattern", () => {
    const md = sheetMarkdown(week);
    const solved = Object.values(mid.problemStates).filter(
      (s) => s.status === "solved" && s.insight,
    );
    expect(solved.length).toBeGreaterThan(0);
    expect(week.counts.insights).toBe(solved.length);
    for (const s of solved) expect(md.split(`**${s.problemId.slice(3)}. `).length - 1).toBe(1);
    expect(md).toContain("### Insights from solved problems, by pattern");
  });
});

describe("custom sheets", () => {
  it("holds only the chosen topics and patterns", () => {
    const md = sheetMarkdown(
      buildSheet(
        {
          scope: "custom",
          topics: ["os.processes"],
          patterns: ["dsa.sliding-window.fixed-size-window"],
        },
        mid,
      ),
    );
    expect(md).toContain("#### Fixed-size window");
    expect(md).toContain("## Operating systems");
    expect(md).not.toContain("## Object-oriented");
    expect(md).toContain("## Your mistake checklist");
  });

  it("loads only the subjects it needs", () => {
    expect(subjectsNeeded({ scope: "custom", subjects: ["cn"] }, mid.model)).toEqual(["cn"]);
    expect(subjectsNeeded({ scope: "day" }, mid.model)).toContain("dsa");
  });
});

describe("exports and tightening", () => {
  it("exports a standalone HTML page with its own light styles and no links out", () => {
    const html = sheetHtml({
      title: week.title,
      dateLabel: week.dateLabel,
      bodyHtml: "<h2>x</h2>",
    });
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain("<style>");
    expect(html).toContain("color-scheme: light");
    expect(html).toContain(".sheet-page-break { break-before: page; }");
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain("<script");
  });

  it("sends whole sections that fit Claude's budget and names the ones left out", () => {
    const small = tightenInput(week, 8 * 1024);
    expect(small.included).toBeGreaterThanOrEqual(1);
    expect(small.included + small.left.length).toBe(week.sections.length);
    expect(small.left.length).toBeGreaterThan(0);
    const all = tightenInput(day, 40 * 1024);
    expect(all.left).toEqual([]);
    expect(new TextEncoder().encode(all.markdown).length).toBeLessThan(40 * 1024);
    expect(all.markdown).toContain("## Before you walk in");
  });

  it("drops Claude's repeated title when showing its version", () => {
    expect(withoutTitle("# 1-day revision sheet\n\n_Sunday_\n\n## Before\n- a")).toBe("## Before\n- a");
    expect(withoutTitle("## Before\n- a")).toBe("## Before\n- a");
  });

  it("aims for about half the words", () => {
    expect(tightenTarget(1000)).toBe(500);
    expect(tightenTarget(1234)).toBe(600);
    expect(tightenTarget(100)).toBe(150);
  });
});
