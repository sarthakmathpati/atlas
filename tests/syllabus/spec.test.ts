// Phase 1 "done when": the syllabus contains all 18 subjects with every topic and concept from
// BUILD_SPEC.md section 6, every connection from 7.1 on both concepts, every prerequisite chain
// from 7.2, and validation passes (no duplicates, no missing references, no cycles).
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSyllabus, findCycle, splitSyllabus } from "../../scripts/build-syllabus.mjs";
import { parseSpecConnections, parseSpecSyllabus, slugify } from "../../scripts/lib/spec.mjs";
import { SPEC_PREREQ_EDGES, SPEC_PREREQ_RULES } from "../../scripts/lib/spec-prereqs.mjs";
import generated from "../../src/data/syllabus.generated.json";

const spec = readFileSync(new URL("../../BUILD_SPEC.md", import.meta.url), "utf8");
const specSubjects = parseSpecSyllabus(spec);
const { syllabus } = buildSyllabus();
const conceptById = new Map(syllabus.concepts.map((c) => [c.id, c]));
const topicById = new Map(syllabus.topics.map((t) => [t.id, t]));
const byRef = new Map(syllabus.concepts.map((c) => [`${c.topicId} › ${c.name}`, c]));
const resolve = (ref: string) => {
  const [topic, name] = ref.split("›").map((s) => s.trim());
  const c = byRef.get(`${topic} › ${name}`);
  if (!c) throw new Error(`unresolved ${ref}`);
  return c;
};

describe("syllabus matches BUILD_SPEC.md section 6", () => {
  it("has the documented totals", () => {
    expect(syllabus.counts).toMatchObject({
      subjects: 18,
      topics: 146,
      concepts: 909,
      must: 400,
      important: 397,
      advanced: 112,
      patterns: 90,
    });
  });

  it("has every subject with the spec's name, tracks, icon and order", () => {
    expect(syllabus.subjects.map((s) => s.id)).toEqual(specSubjects.map((s) => s.id));
    for (const s of specSubjects) {
      const built = syllabus.subjects.find((b) => b.id === s.id)!;
      expect(built).toMatchObject({ name: s.name, tracks: s.tracks, icon: s.icon, order: s.order });
      expect(built.description.length).toBeGreaterThan(10);
      expect(built.regionHue).toBeGreaterThanOrEqual(170);
      expect(built.regionHue).toBeLessThanOrEqual(280); // cool hues only (12.2)
    }
  });

  it("has every topic with the spec's name, prerequisites and order", () => {
    const specTopics = specSubjects.flatMap((s) =>
      s.topics.map((t) => ({ ...t, subjectId: s.id })),
    );
    expect(syllabus.topics.map((t) => t.id)).toEqual(specTopics.map((t) => t.id));
    for (const t of specTopics) {
      expect(topicById.get(t.id)).toMatchObject({
        name: t.name,
        subjectId: t.subjectId,
        prereqTopics: t.prereqs,
        order: t.order,
      });
    }
  });

  it("has every concept with the spec's name, scope, importance, tracks and pattern flag", () => {
    const specConcepts = specSubjects.flatMap((s) =>
      s.topics.flatMap((t) =>
        t.concepts.map((c) => ({ ...c, topicId: t.id, subjectTracks: s.tracks })),
      ),
    );
    expect(syllabus.concepts.map((c) => c.id)).toEqual(specConcepts.map((c) => c.id));
    for (const c of specConcepts) {
      expect(conceptById.get(c.id)).toMatchObject({
        name: c.name,
        scope: c.scope,
        importance: c.importance,
        isPattern: c.isPattern,
        tracks: c.tracks ?? c.subjectTracks,
        topicId: c.topicId,
        order: c.order,
      });
    }
  });

  it("derives every concept id from its topic and name", () => {
    for (const c of syllabus.concepts) expect(c.id).toBe(`${c.topicId}.${slugify(c.name)}`);
  });

  it("shows a subject for a track when any of its concepts belongs to it", () => {
    const sysd = syllabus.subjects.find((s) => s.id === "sysd")!;
    expect(sysd.tracks).toEqual(["sde"]);
    expect(sysd.mapTracks).toEqual(["sde", "quant"]); // the stock exchange matching engine is (sde, quant)
  });
});

describe("connections (section 7.1)", () => {
  it("stores all 89 links on both concepts with the spec's reason", () => {
    const links = parseSpecConnections(spec);
    expect(links).toHaveLength(89);
    expect(syllabus.counts.connections).toBe(89);
    for (const l of links) {
      const a = resolve(`${l.from.topicId} › ${l.from.name}`);
      const b = resolve(`${l.to.topicId} › ${l.to.name}`);
      expect(a.related).toContainEqual({ to: b.id, reason: l.reason });
      expect(b.related).toContainEqual({ to: a.id, reason: l.reason });
    }
  });
});

describe("prerequisites (section 7.2)", () => {
  it("contains every spelled-out chain edge", () => {
    for (const [from, to] of SPEC_PREREQ_EDGES) {
      expect(resolve(to).prereqs, `${from} → ${to}`).toContain(resolve(from).id);
    }
  });

  it("applies the 'every concept' rules", () => {
    for (const rule of SPEC_PREREQ_RULES) {
      const from = resolve(rule.from).id;
      const targets = syllabus.concepts.filter(
        (c) =>
          (rule.toAllInTopic && c.topicId === rule.toAllInTopic) ||
          (rule.toPatternsInTopics?.includes(c.topicId) && c.isPattern),
      );
      expect(targets.length).toBeGreaterThan(0);
      for (const t of targets) expect(t.prereqs, `${rule.from} → ${t.id}`).toContain(from);
    }
  });

  it("forms a DAG with every reference resolving", () => {
    for (const c of syllabus.concepts)
      for (const p of c.prereqs) expect(conceptById.has(p)).toBe(true);
    for (const t of syllabus.topics)
      for (const p of t.prereqTopics) expect(topicById.has(p)).toBe(true);
    expect(
      findCycle(
        syllabus.concepts.map((c) => c.id),
        (id) => conceptById.get(id)!.prereqs,
      ),
    ).toBeNull();
    expect(
      findCycle(
        syllabus.topics.map((t) => t.id),
        (id) => topicById.get(id)!.prereqTopics,
      ),
    ).toBeNull();
  });

  it("stays sparse (well under one prerequisite per concept on average)", () => {
    expect(syllabus.counts.prereqEdges / syllabus.counts.concepts).toBeLessThan(0.8);
  });
});

describe("generated files", () => {
  const { core, contentBySubject } = splitSyllabus(syllabus);
  it("are up to date with content/ (run `npm run build:syllabus` after editing content)", () => {
    expect(generated).toEqual(JSON.parse(JSON.stringify(core)));
    const dir = new URL("../../src/data/content/", import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith(".generated.json"));
    expect(files.sort()).toEqual(
      Object.keys(contentBySubject)
        .map((id) => `${id}.generated.json`)
        .sort(),
    );
    for (const [id, file] of Object.entries(contentBySubject)) {
      const onDisk: unknown = JSON.parse(
        readFileSync(new URL(`${id}.generated.json`, dir), "utf8"),
      );
      expect(onDisk, `src/data/content/${id}.generated.json`).toEqual(
        JSON.parse(JSON.stringify(file)),
      );
    }
  });

  it("flag exactly the concepts whose text is in the content files", () => {
    for (const c of core.concepts) {
      const text = contentBySubject[c.subjectId]![c.id];
      expect(c.written.any, c.id).toBe(text !== undefined);
      if (text) {
        expect(c.written.questions, c.id).toBe(text.questions.length);
        expect(c.written.deep, c.id).toBe(Boolean(text.deep));
      }
    }
  });
});
