// build-syllabus.mjs must FAIL the build on duplicated ids, missing references, unresolved
// connection names, cycles and backwards prerequisites, and (with --strict) on missing content.
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BuildError, buildSyllabus } from "../../scripts/build-syllabus.mjs";

interface MiniContent {
  topicA?: string;
  topicB?: string;
  connections?: string;
}

const SUBJECT = `---
subject: demo
name: "Demo subject"
shortName: "Demo"
order: 1
tracks: [sde]
icon: code
regionHue: 200
description: "A tiny subject for tests."
---
`;

const TOPIC_A = `---
topic: demo.alpha
name: "Alpha"
subject: demo
order: 1
prereqs: []
---

## demo.alpha.first-idea
name: "First idea"
importance: must
scope: "the first thing"

## demo.alpha.second-idea
name: "Second idea"
importance: important
pattern: true
prereqs: [demo.alpha.first-idea]
scope: "the second thing"
`;

const TOPIC_B = `---
topic: demo.beta
name: "Beta: with a colon"
subject: demo
order: 2
prereqs: [demo.alpha]
---

## demo.beta.third-idea
name: "Third idea"
importance: advanced
tracks: [quant]
prereqs: [demo.alpha.second-idea]
scope: "the third thing"
`;

const CONNECTIONS = `| From | To | Why |
|---|---|---|
| demo.alpha › First idea | demo.beta › Third idea | They rhyme. |
`;

function writeContent({
  topicA = TOPIC_A,
  topicB = TOPIC_B,
  connections = CONNECTIONS,
}: MiniContent = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "atlas-content-"));
  mkdirSync(join(dir, "demo"));
  writeFileSync(join(dir, "demo", "_subject.md"), SUBJECT);
  writeFileSync(join(dir, "demo", "alpha.md"), topicA);
  writeFileSync(join(dir, "demo", "beta.md"), topicB);
  writeFileSync(join(dir, "connections.md"), connections);
  return dir;
}

const build = (content: MiniContent = {}, strict = false) =>
  buildSyllabus({ contentDir: writeContent(content), strict });

describe("build-syllabus validation", () => {
  it("builds valid content", () => {
    const { syllabus } = build();
    expect(syllabus.counts).toMatchObject({
      subjects: 1,
      topics: 2,
      concepts: 3,
      patterns: 1,
      connections: 1,
    });
    const third = syllabus.concepts.find((c) => c.id === "demo.beta.third-idea")!;
    expect(third.tracks).toEqual(["quant"]);
    expect(third.related).toEqual([{ to: "demo.alpha.first-idea", reason: "They rhyme." }]);
    expect(syllabus.subjects[0]!.mapTracks).toEqual(["sde", "quant"]);
    expect(syllabus.topics[1]!.name).toBe("Beta: with a colon");
  });

  it("fails on a duplicated concept id", () => {
    const dup = `${TOPIC_A}\n## demo.alpha.first-idea\nname: "First idea"\nimportance: must\nscope: "again"\n`;
    expect(() => build({ topicA: dup })).toThrow(BuildError);
    expect(() => build({ topicA: dup })).toThrow(/Duplicate concept id/);
  });

  it("fails on a prerequisite that does not exist", () => {
    const bad = TOPIC_B.replace("demo.alpha.second-idea", "demo.alpha.missing");
    expect(() => build({ topicB: bad })).toThrow(
      /prerequisite "demo.alpha.missing" does not exist/,
    );
  });

  it("fails on a missing prerequisite topic", () => {
    const bad = TOPIC_B.replace("prereqs: [demo.alpha]", "prereqs: [demo.gamma]");
    expect(() => build({ topicB: bad })).toThrow(/prerequisite topic "demo.gamma" does not exist/);
  });

  it("fails on a concept prerequisite cycle", () => {
    const bad = TOPIC_A.replace(
      'importance: must\nscope: "the first thing"',
      'importance: must\nprereqs: [demo.alpha.second-idea]\nscope: "the first thing"',
    );
    expect(() => build({ topicA: bad })).toThrow(/Concept prerequisite cycle/);
  });

  it("fails on a topic prerequisite cycle", () => {
    const bad = TOPIC_A.replace("prereqs: []", "prereqs: [demo.beta]");
    expect(() => build({ topicA: bad })).toThrow(/Topic prerequisite cycle/);
  });

  it("fails when a concept requires one from a later topic", () => {
    // No concept cycle here: third-idea has no prerequisites, but topic beta comes after alpha.
    const topicA = TOPIC_A.replace(
      'importance: must\nscope: "the first thing"',
      'importance: must\nprereqs: [demo.beta.third-idea]\nscope: "the first thing"',
    );
    const topicB = TOPIC_B.replace("prereqs: [demo.alpha.second-idea]\n", "");
    expect(() => build({ topicA, topicB })).toThrow(/topic demo.beta comes after demo.alpha/);
  });

  it("fails when a connection name does not resolve", () => {
    const bad = CONNECTIONS.replace("Third idea", "Fourth idea");
    expect(() => build({ connections: bad })).toThrow(/does not match any concept name/);
  });

  it("fails on a concept id that does not belong to its topic", () => {
    const bad = TOPIC_B.replace("## demo.beta.third-idea", "## demo.alpha.third-idea");
    expect(() => build({ topicB: bad })).toThrow(/must be "demo.beta.<slug>"/);
  });

  it("warns (without failing) about missing content, and fails with --strict", () => {
    const { report } = build();
    expect(report.perSubject.get("demo")).toMatchObject({
      concepts: 3,
      core: 0,
      must: 1,
      mustDeep: 0,
    });
    expect(() => build({}, true)).toThrow(/Strict mode/);
  });

  it("passes --strict once required content is written, ignoring headings inside code", () => {
    const content = (deep: boolean, pattern: boolean) => `
### simple
It is like a first step on a path. You take it before anything else.

### interview
- Point one.
- Point two, which
  continues on a second line.
- Point three.
${deep ? "\n### deep\nIntro.\n\n#### A sub-heading\n\n```python\n## not a concept heading\n### simple\nprint(1)\n```\n" : ""}
### questions
Q: What is it?
A: The first idea.
Q: Why?
A: Because.
Q: When?
A: Early.
${pattern ? "\n### signals\n- one\n- two\n- three\n\n### template\n```cpp\nint main() {}\n```\n" : ""}`;
    const topicA = TOPIC_A.replace(
      'scope: "the first thing"',
      `scope: "the first thing"\n${content(true, false)}`,
    ).replace('scope: "the second thing"', `scope: "the second thing"\n${content(false, true)}`);
    const topicB = TOPIC_B.replace(
      'scope: "the third thing"',
      `scope: "the third thing"\n${content(false, false)}`,
    );
    const { syllabus } = build({ topicA, topicB }, true);
    const first = syllabus.concepts[0]!;
    expect(first.content.interview).toHaveLength(3);
    expect(first.content.interview[1]).toBe("Point two, which\ncontinues on a second line.");
    expect(first.content.deep).toContain("## not a concept heading");
    expect(first.content.questions).toHaveLength(3);
    expect(syllabus.concepts[1]!.content.signals).toEqual(["one", "two", "three"]);
    expect(syllabus.concepts[1]!.content.template).toContain("int main");
  });
});
