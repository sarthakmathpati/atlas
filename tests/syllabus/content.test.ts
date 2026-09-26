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
import { BEHAVIORAL_QUESTIONS, STORY_TAGS } from "@/data/behavioral.seed";
import { DESIGN_PROBLEMS } from "@/data/designs.seed";
import { conceptById, subjects } from "@/data/syllabus";
import { customToConcept } from "@/lib/concepts/custom";
import { buildSyllabus } from "../../scripts/build-syllabus.mjs";

const FINISHED = [
  "dsa",
  "oop",
  "os",
  "cn",
  "dbms",
  "sql",
  "sysd",
  "lang",
  "conc",
  "lld",
  "prob",
  "math",
  "puzzles",
  "markets",
  "arch",
  "apt",
  "eng",
  "career",
];

const { syllabus, report } = buildSyllabus();
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

// Phase 5 wrote every subject, so the strict rules now hold for all of them.
it("finishes every subject", () => {
  expect([...FINISHED].sort()).toEqual(subjects.map((s) => s.id).sort());
});

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

// The story bank article checks a made-up candidate's stories against the app's behavioral
// question bank (section 8.5) in a C++ program, so its copy of the bank must match the seed:
// the same ids, in order, with the same suggested tags, and only tags the app knows.
describe("the story bank article uses the behavioral question bank", () => {
  const deep = syllabus.concepts.find((c) => c.id === "career.behavioral.building-a-story-bank")!
    .content.deep!;
  const program = deep.match(/```cpp\n([\s\S]*?)```/)![1]!;
  const entries = (name: string) => {
    const block = program.split(`${name} = {`)[1]!.split("};")[0]!;
    return [...block.matchAll(/\{"([^"]+)",\s*"([^"]+)"\}/g)].map(([, id, tags]) => ({
      id: id!,
      tags: tags!.split(" "),
    }));
  };

  it("copies every question id and its suggested tags", () => {
    expect(entries("questions")).toEqual(
      BEHAVIORAL_QUESTIONS.map((q) => ({ id: q.id, tags: [...q.suggestedTags] })),
    );
  });

  it("tags the stories with the app's story tags", () => {
    const known = new Set<string>(STORY_TAGS);
    expect(entries("bank")).toHaveLength(8); // six stories and two prepared answers
    for (const story of entries("bank")) {
      for (const tag of story.tags) expect(known.has(tag), `${story.id}: ${tag}`).toBe(true);
    }
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
    // Every syllabus concept is written now; the owner's own concepts never have text.
    const unwritten = customToConcept({
      id: "custom.test",
      topicId: "dsa.graph-basics",
      name: "My note",
      scope: "",
      importance: "important",
      createdAt: "2026-09-26T00:00:00.000Z",
      updatedAt: "2026-09-26T00:00:00.000Z",
    })!;
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
