// Written content (Phase 5): a finished subject passes every --strict rule, and its text fits how
// the app shows it. Add a subject to FINISHED once its content session is done.
import { describe, expect, it } from "vitest";
import {
  conceptContentNow,
  EMPTY_CONTENT,
  loadConceptContent,
  loadedSubjectContent,
  loadSubjectContent,
} from "@/data/content";
import { DESIGN_PROBLEMS } from "@/data/designs.seed";
import { conceptById, concepts } from "@/data/syllabus";
import { buildSyllabus } from "../../scripts/build-syllabus.mjs";

const FINISHED = ["dsa", "oop", "os", "cn", "dbms", "sql", "sysd", "lang", "conc", "lld", "prob", "math"];

const { syllabus, report } = buildSyllabus();
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

describe.each(FINISHED)("content for %s", (subjectId) => {
  const built = syllabus.concepts.filter((c) => c.subjectId === subjectId);

  it("has no missing sections and no shape problems", () => {
    expect(report.problems.filter((p: string) => p.startsWith(`${subjectId}.`))).toEqual([]);
    const counts = report.perSubject.get(subjectId)!;
    expect(counts.core).toBe(counts.concepts);
    expect(counts.mustDeep).toBe(counts.must);
    expect(counts.patternExtras).toBe(counts.patterns);
  });

  it("keeps must-know deep articles to roughly 300 to 900 words", () => {
    for (const c of built.filter((c) => c.importance === "must")) {
      const n = words(c.content.deep!);
      expect(n, c.id).toBeGreaterThanOrEqual(300);
      expect(n, c.id).toBeLessThanOrEqual(900);
    }
  });

  it("writes questions and signals as plain text, since they render without markdown", () => {
    for (const c of built) {
      for (const { q, a } of c.content.questions) {
        expect(q, c.id).toMatch(/[?.]$/);
        expect(`${q} ${a}`, c.id).not.toMatch(/[`$]|\*\*/);
      }
      for (const s of c.content.signals ?? []) expect(s, c.id).not.toMatch(/[`$]|\*\*/);
    }
  });

  it("gives patterns a code template and a first signal that doesn't name them", () => {
    for (const c of built.filter((c) => c.isPattern)) {
      expect(c.content.template, c.id).toMatch(/^```\w+\n/);
      // The first signal is the hint ladder's level 1 clue, which must not give the pattern away.
      expect(c.content.signals![0]!.toLowerCase(), c.id).not.toContain(c.name.toLowerCase());
    }
  });
});

// Each classic LLD article ends with an "Interview checklist" that names every "must discuss"
// point of its design prompt's rubric (section 8.4) and says where the design handles it.
describe("LLD classics cover their design prompt's rubric", () => {
  const prompts = DESIGN_PROBLEMS.filter((p) => p.source === "design-lld");
  it.each(prompts.map((p) => [p.id, p] as const))("%s", (_id, prompt) => {
    const built = syllabus.concepts.find((c) => c.id === prompt.conceptIds[0])!;
    const checklist = built.content.deep!.split("#### Interview checklist")[1];
    expect(checklist, prompt.id).toBeDefined();
    for (const point of prompt.rubric!) expect(checklist, prompt.id).toContain(`**${point}**`);
  });
});

// The owner studies in C++ only (CLAUDE.md decision 58): no Python or Java code, and no
// comparisons with them, anywhere in concept names, scopes or text. The lang subject's Java and
// Python topics are the one exception, since they exist for other primary languages.
const OTHER_LANGUAGE_TOPICS = new Set(["lang.java-core", "lang.python-core"]);

describe("C++ only", () => {
  const checked = syllabus.concepts.filter((c) => !OTHER_LANGUAGE_TOPICS.has(c.topicId));
  const textOf = (c: (typeof checked)[number]) => {
    const { simple, interview, deep, questions, signals, template } = c.content;
    const qa = questions.flatMap(({ q, a }: { q: string; a: string }) => [q, a]);
    return [c.name, c.scope, simple, ...interview, deep, ...qa, ...(signals ?? []), template]
      .filter(Boolean)
      .join("\n");
  };

  it("has no Python or Java code blocks", () => {
    for (const c of checked) expect(textOf(c), c.id).not.toMatch(/^\s*```(python|py|java)\b/m);
  });

  it("never mentions Python or Java", () => {
    for (const c of checked) expect(textOf(c), c.id).not.toMatch(/\b(python|java)\b/i);
  });
});

describe("content loader", () => {
  it("loads a subject's text on demand and knows unwritten concepts without loading", async () => {
    const bfs = conceptById.get("dsa.graph-basics.bfs")!;
    const unwritten = concepts.find((c) => !c.written.any)!;
    expect(conceptContentNow(unwritten)).toBe(EMPTY_CONTENT);
    expect(loadedSubjectContent("dsa")).toBeUndefined();
    expect(conceptContentNow(bfs)).toBeUndefined();
    const [a, b] = [loadSubjectContent("dsa"), loadSubjectContent("dsa")];
    expect(a).toBe(b); // one load, shared
    await a;
    const content = conceptContentNow(bfs)!;
    const built = syllabus.concepts.find((c) => c.id === bfs.id)!.content;
    expect(content).toEqual(built);
    expect(await loadConceptContent(bfs)).toBe(content);
  });
});
