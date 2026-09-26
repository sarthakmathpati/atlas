#!/usr/bin/env node
// Builds the syllabus from the human-readable content/ folder (BUILD_SPEC.md sections 5.1 to 5.3)
// and writes it in two parts:
//   src/data/syllabus.generated.json        structure: subjects, topics, concepts (with `written`
//                                           flags saying what text exists), loaded at startup
//   src/data/content/<subject>.generated.json   each concept's text, loaded when first needed
//
//   npm run build:syllabus              validate structure, warn about missing content
//   npm run build:syllabus -- --strict  also fail on missing or malformed required content
//
// The build FAILS when: an id is duplicated or malformed, a prerequisite or connection points to
// a missing id, a connection name does not resolve, the topic or concept prerequisite graph has a
// cycle, or a concept prerequisite points "backwards" against the topic order.
// Missing content is only a warning (with a per-subject count) unless --strict is given.
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  statSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { join, relative, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { slugify, parseConnectionTable } from "./lib/spec.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONTENT_DIR = join(ROOT, "content");
const OUT_PATH = join(ROOT, "src", "data", "syllabus.generated.json");
const CONTENT_OUT_DIR = join(ROOT, "src", "data", "content");
const QUANT_SEED_PATH = join(ROOT, "src", "data", "quant.seed.ts");

export const SYLLABUS_FORMAT_VERSION = 2;
const IMPORTANCE = new Set(["must", "important", "advanced"]);
const TRACKS = new Set(["sde", "quant"]);
const SECTION_NAMES = new Set(["simple", "interview", "deep", "questions", "signals", "template"]);
const DEFAULT_EST_MINUTES = 25;
const ID_PART = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class BuildError extends Error {}

// ---------------------------------------------------------------------------------------------
// Small parsers
// ---------------------------------------------------------------------------------------------

/** Parses one "key: value" value: "quoted string", [list, of, ids], number, true/false, or text. */
function parseValue(raw, where) {
  const v = raw.trim();
  if (v.startsWith('"')) {
    try {
      return JSON.parse(v);
    } catch {
      throw new BuildError(`${where}: bad quoted string ${v}`);
    }
  }
  if (v.startsWith("[")) {
    if (!v.endsWith("]")) throw new BuildError(`${where}: unterminated list ${v}`);
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((s) => {
      const t = s.trim();
      return t.startsWith('"') ? JSON.parse(t) : t;
    });
  }
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function parseKeyValueLines(lines, where) {
  const out = {};
  for (const line of lines) {
    if (!line.trim()) continue;
    const i = line.indexOf(":");
    if (i < 0) throw new BuildError(`${where}: expected "key: value", got "${line}"`);
    const key = line.slice(0, i).trim();
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key)) throw new BuildError(`${where}: bad key "${key}"`);
    out[key] = parseValue(line.slice(i + 1), `${where} (${key})`);
  }
  return out;
}

/** Splits "---\nfront matter\n---\nbody" into { meta, body, bodyStartLine }. */
function splitFrontMatter(text, file) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (lines[0] !== "---")
    throw new BuildError(`${file}: must start with a front-matter block (---)`);
  const end = lines.indexOf("---", 1);
  if (end < 0) throw new BuildError(`${file}: front matter is not closed with ---`);
  return {
    meta: parseKeyValueLines(lines.slice(1, end), file),
    bodyLines: lines.slice(end + 1),
    bodyStartLine: end + 2,
  };
}

const CONCEPT_HEADING = /^## ([a-z0-9-]+(?:\.[a-z0-9-]+){2,})\s*$/;
const SECTION_HEADING = /^### ([a-z]+)\s*$/;

/** Splits a topic body into concept blocks, ignoring headings inside code fences. */
function splitConcepts(bodyLines, startLine, file) {
  const blocks = [];
  let current = null;
  let inFence = false;
  bodyLines.forEach((line, idx) => {
    const lineNo = startLine + idx;
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const heading = !inFence && line.match(CONCEPT_HEADING);
    if (heading) {
      current = { id: heading[1], lines: [], line: lineNo };
      blocks.push(current);
      return;
    }
    if (current) current.lines.push({ text: line, lineNo, inFence });
    else if (line.trim() && !inFence) {
      throw new BuildError(`${file}:${lineNo}: text before the first "## <concept id>" heading`);
    }
  });
  return blocks;
}

function trimBlankLines(lines) {
  let a = 0;
  let b = lines.length;
  while (a < b && !lines[a].trim()) a++;
  while (b > a && !lines[b - 1].trim()) b--;
  return lines.slice(a, b);
}

function parseBullets(lines) {
  const items = [];
  for (const line of lines) {
    const m = line.match(/^[-*] (.*)$/);
    if (m) items.push(m[1].trim());
    else if (line.trim() && items.length) items[items.length - 1] += `\n${line.trim()}`;
  }
  return items;
}

function parseQuestions(lines, where) {
  const qas = [];
  let cur = null;
  let field = null;
  for (const line of lines) {
    const q = line.match(/^Q:\s*(.*)$/);
    const a = line.match(/^A:\s*(.*)$/);
    if (q) {
      cur = { q: q[1].trim(), a: "" };
      qas.push(cur);
      field = "q";
    } else if (a) {
      if (!cur) throw new BuildError(`${where}: "A:" without a preceding "Q:"`);
      cur.a = a[1].trim();
      field = "a";
    } else if (cur && field) {
      cur[field] = cur[field] ? `${cur[field]}\n${line}` : line;
    }
  }
  for (const qa of qas) {
    qa.q = qa.q.trim();
    qa.a = qa.a.trim();
    if (!qa.q || !qa.a) throw new BuildError(`${where}: every question needs both Q: and A:`);
  }
  return qas;
}

/** Parses one concept block into meta + content sections. */
function parseConceptBlock(block, file) {
  const where = `${file}:${block.line} (${block.id})`;
  const metaLines = [];
  const sections = {};
  let section = null;
  for (const { text, inFence, lineNo } of block.lines) {
    const h = !inFence && text.match(SECTION_HEADING);
    if (h && SECTION_NAMES.has(h[1])) {
      section = h[1];
      if (sections[section]) throw new BuildError(`${where}: duplicate "### ${section}" section`);
      sections[section] = [];
      continue;
    }
    // Only the six reserved level-3 headings are allowed; anything else would silently become
    // part of the previous section (for example, text appended to an answer).
    if (!inFence && /^### /.test(text)) {
      throw new BuildError(
        `${file}:${lineNo} (${block.id}): "${text.trim()}" is not a section heading; use one of ${[...SECTION_NAMES].map((s) => `"### ${s}"`).join(", ")}, or "####" inside an article`,
      );
    }
    if (section) sections[section].push(text);
    else metaLines.push(text);
  }
  const meta = parseKeyValueLines(metaLines, where);
  const content = { simple: "", interview: [], questions: [] };
  if (sections.simple) content.simple = trimBlankLines(sections.simple).join("\n");
  if (sections.interview) content.interview = parseBullets(sections.interview);
  if (sections.deep) {
    const deep = trimBlankLines(sections.deep).join("\n");
    if (deep) content.deep = deep;
  }
  if (sections.questions) content.questions = parseQuestions(sections.questions, where);
  if (sections.signals) {
    const signals = parseBullets(sections.signals);
    if (signals.length) content.signals = signals;
  }
  if (sections.template) {
    const template = trimBlankLines(sections.template).join("\n");
    if (template) content.template = template;
  }
  if (meta.needsReview === true) content.needsReview = true;
  return { meta, content };
}

// ---------------------------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------------------------

function listSubjectDirs(contentDir) {
  return readdirSync(contentDir)
    .filter((name) => statSync(join(contentDir, name)).isDirectory())
    .sort();
}

function requireFields(obj, fields, where) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === "") throw new BuildError(`${where}: missing "${f}"`);
  }
}

function checkTracks(tracks, where) {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new BuildError(`${where}: tracks must be a non-empty list`);
  }
  for (const t of tracks)
    if (!TRACKS.has(t)) throw new BuildError(`${where}: unknown track "${t}"`);
}

function loadContent(contentDir) {
  const subjects = [];
  const topics = [];
  const concepts = [];
  const warnings = [];

  for (const dir of listSubjectDirs(contentDir)) {
    const subjectFile = join(contentDir, dir, "_subject.md");
    const rel = relative(ROOT, subjectFile);
    if (!existsSync(subjectFile))
      throw new BuildError(`${relative(ROOT, join(contentDir, dir))}: missing _subject.md`);
    const { meta: s } = splitFrontMatter(readFileSync(subjectFile, "utf8"), rel);
    requireFields(
      s,
      ["subject", "name", "shortName", "order", "tracks", "icon", "regionHue", "description"],
      rel,
    );
    if (s.subject !== dir)
      throw new BuildError(`${rel}: subject id "${s.subject}" must match its folder "${dir}"`);
    if (!ID_PART.test(s.subject)) throw new BuildError(`${rel}: bad subject id "${s.subject}"`);
    checkTracks(s.tracks, rel);
    subjects.push({
      id: s.subject,
      name: s.name,
      shortName: s.shortName,
      tracks: s.tracks,
      mapTracks: [],
      order: s.order,
      icon: s.icon,
      regionHue: s.regionHue,
      description: s.description,
    });

    const topicFiles = readdirSync(join(contentDir, dir))
      .filter((f) => f.endsWith(".md") && f !== "_subject.md")
      .sort();
    for (const f of topicFiles) {
      const path = join(contentDir, dir, f);
      const relTopic = relative(ROOT, path);
      const {
        meta: t,
        bodyLines,
        bodyStartLine,
      } = splitFrontMatter(readFileSync(path, "utf8"), relTopic);
      requireFields(t, ["topic", "name", "subject", "order", "prereqs"], relTopic);
      const expectedId = `${dir}.${basename(f, ".md")}`;
      if (t.topic !== expectedId) {
        throw new BuildError(
          `${relTopic}: topic id "${t.topic}" must be "${expectedId}" (from the file name)`,
        );
      }
      if (t.subject !== dir) throw new BuildError(`${relTopic}: subject must be "${dir}"`);
      if (t.tracks) checkTracks(t.tracks, relTopic);
      const topic = {
        id: t.topic,
        subjectId: dir,
        name: t.name,
        order: t.order,
        prereqTopics: t.prereqs,
        tracks: t.tracks ?? s.tracks,
      };
      topics.push(topic);

      const blocks = splitConcepts(bodyLines, bodyStartLine, relTopic);
      blocks.forEach((block, i) => {
        const where = `${relTopic}:${block.line}`;
        if (
          !block.id.startsWith(`${topic.id}.`) ||
          block.id.split(".").length !== topic.id.split(".").length + 1
        ) {
          throw new BuildError(`${where}: concept id "${block.id}" must be "${topic.id}.<slug>"`);
        }
        const { meta, content } = parseConceptBlock(block, relTopic);
        requireFields(meta, ["name", "importance", "scope"], where);
        if (!IMPORTANCE.has(meta.importance)) {
          throw new BuildError(`${where}: importance must be must, important or advanced`);
        }
        if (meta.tracks) checkTracks(meta.tracks, where);
        const slug = block.id.slice(topic.id.length + 1);
        if (!ID_PART.test(slug)) throw new BuildError(`${where}: bad concept id "${block.id}"`);
        // `renamed: true` marks a concept whose name changed after it shipped: the id stays, so
        // saved progress keeps pointing at it.
        if (slug !== slugify(meta.name) && meta.renamed !== true) {
          warnings.push(
            `${where}: id "${block.id}" does not match the slug of its name ("${slugify(meta.name)}"). After a rename, keep the id and add "renamed: true" (or change it and add an ID_ALIASES entry).`,
          );
        }
        concepts.push({
          id: block.id,
          topicId: topic.id,
          subjectId: dir,
          name: meta.name,
          scope: meta.scope,
          importance: meta.importance,
          tracks: meta.tracks ?? topic.tracks,
          order: i + 1,
          prereqs: meta.prereqs ?? [],
          related: [],
          estMinutes: meta.estMinutes ?? DEFAULT_EST_MINUTES,
          isPattern: meta.pattern === true,
          content,
        });
      });
      if (blocks.length === 0) throw new BuildError(`${relTopic}: topic has no concepts`);
    }
  }
  return { subjects, topics, concepts, warnings };
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

function assertUnique(items, what) {
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.id)) throw new BuildError(`Duplicate ${what} id "${it.id}"`);
    seen.add(it.id);
  }
}

/** Throws with the cycle path if the graph (id -> prerequisite ids) has a cycle. */
export function findCycle(ids, prereqsOf) {
  const state = new Map();
  const stack = [];
  const visit = (id) => {
    const s = state.get(id);
    if (s === 2) return null;
    if (s === 1) return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 1);
    stack.push(id);
    for (const p of prereqsOf(id)) {
      const cycle = visit(p);
      if (cycle) return cycle;
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const id of ids) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return null;
}

function validateGraph({ subjects, topics, concepts }) {
  assertUnique(subjects, "subject");
  assertUnique(topics, "topic");
  assertUnique(concepts, "concept");
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const conceptById = new Map(concepts.map((c) => [c.id, c]));

  for (const t of topics) {
    for (const p of t.prereqTopics) {
      if (!topicById.has(p))
        throw new BuildError(`Topic ${t.id}: prerequisite topic "${p}" does not exist`);
      if (p === t.id) throw new BuildError(`Topic ${t.id} lists itself as a prerequisite`);
    }
  }
  const topicCycle = findCycle(
    topics.map((t) => t.id),
    (id) => topicById.get(id).prereqTopics,
  );
  if (topicCycle) throw new BuildError(`Topic prerequisite cycle: ${topicCycle.join(" -> ")}`);

  for (const c of concepts) {
    for (const p of c.prereqs) {
      if (!conceptById.has(p))
        throw new BuildError(`Concept ${c.id}: prerequisite "${p}" does not exist`);
      if (p === c.id) throw new BuildError(`Concept ${c.id} lists itself as a prerequisite`);
    }
  }
  const conceptCycle = findCycle(
    concepts.map((c) => c.id),
    (id) => conceptById.get(id).prereqs,
  );
  if (conceptCycle)
    throw new BuildError(`Concept prerequisite cycle: ${conceptCycle.join(" -> ")}`);

  // A concept prerequisite must never live in a topic that itself (transitively) requires the
  // dependent concept's topic: that would make "ready to learn" impossible to satisfy.
  const ancestors = new Map();
  const topicAncestors = (id) => {
    if (ancestors.has(id)) return ancestors.get(id);
    const set = new Set();
    for (const p of topicById.get(id).prereqTopics) {
      set.add(p);
      for (const a of topicAncestors(p)) set.add(a);
    }
    ancestors.set(id, set);
    return set;
  };
  for (const c of concepts) {
    for (const p of c.prereqs) {
      const pTopic = conceptById.get(p).topicId;
      if (pTopic !== c.topicId && topicAncestors(pTopic).has(c.topicId)) {
        throw new BuildError(
          `Concept ${c.id} requires ${p}, but topic ${pTopic} comes after ${c.topicId} in the topic order`,
        );
      }
    }
  }
}

/**
 * Content may link to another concept with a Markdown link to its page, `[text](#/concept/<id>)`
 * (the map's panel opens it in place), or to a quant puzzle, `[text](#/problems/q-<slug>)`, to
 * practice on instead of repeating it. Every such link must resolve, and no other in-app link is
 * allowed in content, since routes may change.
 */
function validateContentLinks(concepts, puzzleIds) {
  const ids = new Set(concepts.map((c) => c.id));
  for (const c of concepts) {
    const { simple, interview, deep } = c.content;
    const text = [simple, ...interview, deep].filter(Boolean).join("\n");
    for (const m of text.matchAll(/\]\((#[^)\s]*)\)/g)) {
      const puzzle = /^#\/problems\/(q-[a-z0-9-]+)$/.exec(m[1])?.[1];
      if (puzzle) {
        if (!puzzleIds.has(puzzle))
          throw new BuildError(`Concept ${c.id}: link to missing quant puzzle "${puzzle}"`);
        continue;
      }
      const id = /^#\/concept\/([a-z0-9.-]+)$/.exec(m[1])?.[1];
      if (!id)
        throw new BuildError(
          `Concept ${c.id}: in-app links must be #/concept/<id> or #/problems/<quant puzzle id> (${m[1]})`,
        );
      if (!ids.has(id)) throw new BuildError(`Concept ${c.id}: link to missing concept "${id}"`);
      if (id === c.id) throw new BuildError(`Concept ${c.id} links to itself`);
    }
  }
}

/**
 * Ids of the quant puzzles content may link to, read from the seed file's `id: "q-…"` lines (the
 * seed is TypeScript, so it isn't imported here; tests/seed/quant.test.ts checks this list).
 */
export function quantPuzzleIds(path = QUANT_SEED_PATH) {
  const text = readFileSync(path, "utf8");
  return new Set([...text.matchAll(/^\s*id: "(q-[a-z0-9-]+)",$/gm)].map((m) => m[1]));
}

function resolveConnections(concepts, contentDir) {
  const path = join(contentDir, "connections.md");
  if (!existsSync(path)) throw new BuildError("content/connections.md is missing");
  const rows = parseConnectionTable(readFileSync(path, "utf8"));
  const byRef = new Map(concepts.map((c) => [`${c.topicId}›${c.name}`, c]));
  const resolve = (ref) => {
    const c = byRef.get(`${ref.topicId}›${ref.name}`);
    if (!c)
      throw new BuildError(
        `content/connections.md: "${ref.topicId} › ${ref.name}" does not match any concept name`,
      );
    return c;
  };
  let count = 0;
  for (const row of rows) {
    const a = resolve(row.from);
    const b = resolve(row.to);
    if (a.id === b.id) throw new BuildError(`content/connections.md: ${a.id} links to itself`);
    for (const [x, y] of [
      [a, b],
      [b, a],
    ]) {
      if (!x.related.some((r) => r.to === y.id)) x.related.push({ to: y.id, reason: row.reason });
    }
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------------------------
// Content completeness (warnings, or errors with --strict)
// ---------------------------------------------------------------------------------------------

function sentenceCount(text) {
  const stripped = text.replace(/`[^`]*`/g, "x").replace(/\$[^$]*\$/g, "x");
  return (stripped.match(/[.!?](\s|$)/g) ?? []).length;
}

function contentReport(subjects, concepts) {
  const problems = [];
  const perSubject = new Map(
    subjects.map((s) => [
      s.id,
      { concepts: 0, core: 0, must: 0, mustDeep: 0, patterns: 0, patternExtras: 0 },
    ]),
  );
  for (const c of concepts) {
    const r = perSubject.get(c.subjectId);
    const { content } = c;
    r.concepts++;
    const missing = [];
    if (!content.simple) missing.push("simple");
    if (content.interview.length === 0) missing.push("interview");
    if (content.questions.length === 0) missing.push("questions");
    if (missing.length === 0) r.core++;
    if (c.importance === "must") {
      r.must++;
      if (content.deep) r.mustDeep++;
      else missing.push("deep");
    }
    if (c.isPattern) {
      r.patterns++;
      if (content.signals && content.template) r.patternExtras++;
      if (!content.signals) missing.push("signals");
      if (!content.template) missing.push("template");
    }
    if (missing.length) problems.push(`${c.id}: missing ${missing.join(", ")}`);

    // Shape rules from section 5.3, checked only once the content exists.
    if (content.simple) {
      const n = sentenceCount(content.simple);
      if (n < 2 || n > 4)
        problems.push(`${c.id}: simple level should be 2 to 4 sentences (found ${n})`);
    }
    if (
      content.interview.length &&
      (content.interview.length < 3 || content.interview.length > 7)
    ) {
      problems.push(
        `${c.id}: interview level should have 3 to 7 bullets (found ${content.interview.length})`,
      );
    }
    if (
      content.questions.length &&
      (content.questions.length < 3 || content.questions.length > 5)
    ) {
      problems.push(`${c.id}: should have 3 to 5 questions (found ${content.questions.length})`);
    }
    if (content.signals && (content.signals.length < 3 || content.signals.length > 6)) {
      problems.push(`${c.id}: should have 3 to 6 signals (found ${content.signals.length})`);
    }
  }
  return { perSubject, problems };
}

// ---------------------------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------------------------

/** Builds the syllabus object. Throws BuildError on structural problems (and on content problems
 *  when `strict`). Returns { syllabus, warnings, report }. */
export function buildSyllabus({ strict = false, contentDir = CONTENT_DIR } = {}) {
  const loaded = loadContent(contentDir);
  const { subjects, topics, concepts, warnings } = loaded;
  subjects.sort((a, b) => a.order - b.order);
  const subjectOrder = new Map(subjects.map((s, i) => [s.id, i]));
  topics.sort(
    (a, b) => subjectOrder.get(a.subjectId) - subjectOrder.get(b.subjectId) || a.order - b.order,
  );
  const topicOrder = new Map(topics.map((t, i) => [t.id, i]));
  concepts.sort(
    (a, b) => topicOrder.get(a.topicId) - topicOrder.get(b.topicId) || a.order - b.order,
  );

  validateGraph(loaded);
  validateContentLinks(concepts, quantPuzzleIds());
  const connections = resolveConnections(concepts, contentDir);

  // A subject shows on the map for a track when any of its concepts belongs to that track.
  for (const s of subjects) {
    const set = new Set();
    for (const c of concepts) if (c.subjectId === s.id) for (const t of c.tracks) set.add(t);
    s.mapTracks = ["sde", "quant"].filter((t) => set.has(t));
  }

  const report = contentReport(subjects, concepts);
  if (strict && report.problems.length) {
    throw new BuildError(
      `Strict mode: ${report.problems.length} content problem(s):\n  ${report.problems.slice(0, 60).join("\n  ")}${
        report.problems.length > 60 ? `\n  … and ${report.problems.length - 60} more` : ""
      }`,
    );
  }

  const counts = {
    subjects: subjects.length,
    topics: topics.length,
    concepts: concepts.length,
    must: concepts.filter((c) => c.importance === "must").length,
    important: concepts.filter((c) => c.importance === "important").length,
    advanced: concepts.filter((c) => c.importance === "advanced").length,
    patterns: concepts.filter((c) => c.isPattern).length,
    prereqEdges: concepts.reduce((n, c) => n + c.prereqs.length, 0),
    connections,
  };

  const syllabus = { formatVersion: SYLLABUS_FORMAT_VERSION, counts, subjects, topics, concepts };
  return { syllabus, warnings, report };
}

/** What text a concept has, so the app knows without loading the subject's content file. */
export function writtenFlags(content) {
  const flags = {
    core: Boolean(content.simple) && content.interview.length > 0 && content.questions.length > 0,
    deep: Boolean(content.deep),
    questions: content.questions.length,
    any: Boolean(
      content.simple ||
      content.interview.length ||
      content.deep ||
      content.questions.length ||
      content.signals?.length ||
      content.template,
    ),
  };
  if (content.needsReview) flags.needsReview = true;
  return flags;
}

/**
 * Splits the built syllabus into the startup structure (each concept's `content` replaced by its
 * `written` flags) and one content file per subject ({ conceptId: content }, written concepts only).
 */
export function splitSyllabus(syllabus) {
  const contentBySubject = Object.fromEntries(syllabus.subjects.map((s) => [s.id, {}]));
  const concepts = syllabus.concepts.map(({ content, ...rest }) => {
    const written = writtenFlags(content);
    if (written.any) contentBySubject[rest.subjectId][rest.id] = content;
    return { ...rest, written };
  });
  return { core: { ...syllabus, concepts }, contentBySubject };
}

function printReport({ syllabus, warnings, report }) {
  const { counts } = syllabus;
  console.log(
    `✓ Syllabus: ${counts.subjects} subjects, ${counts.topics} topics, ${counts.concepts} concepts ` +
      `(${counts.must} must, ${counts.important} important, ${counts.advanced} advanced, ${counts.patterns} patterns), ` +
      `${counts.prereqEdges} prerequisite edges, ${counts.connections} connections.`,
  );
  for (const w of warnings) console.warn(`! ${w}`);
  const incomplete = [...report.perSubject].filter(
    ([, r]) => r.core < r.concepts || r.mustDeep < r.must || r.patternExtras < r.patterns,
  );
  if (incomplete.length) {
    console.warn("! Content still to write (warning only; `--strict` makes this an error):");
    for (const [id, r] of incomplete) {
      const parts = [
        `${r.core}/${r.concepts} have simple, interview and questions`,
        `${r.mustDeep}/${r.must} must-know have deep`,
      ];
      if (r.patterns)
        parts.push(`${r.patternExtras}/${r.patterns} patterns have signals and template`);
      console.warn(`    ${id.padEnd(8)} ${parts.join("; ")}`);
    }
  }
  const shapeProblems = report.problems.filter((p) => !p.includes(": missing "));
  for (const p of shapeProblems.slice(0, 40)) console.warn(`! ${p}`);
}

function main() {
  const strict = process.argv.includes("--strict");
  try {
    const result = buildSyllabus({ strict });
    const { core, contentBySubject } = splitSyllabus(result.syllabus);
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, `${JSON.stringify(core, null, 1)}\n`);
    // One file per subject; files of subjects that no longer exist are removed.
    mkdirSync(CONTENT_OUT_DIR, { recursive: true });
    const keep = new Set(Object.keys(contentBySubject).map((id) => `${id}.generated.json`));
    for (const f of readdirSync(CONTENT_OUT_DIR)) {
      if (f.endsWith(".generated.json") && !keep.has(f)) rmSync(join(CONTENT_OUT_DIR, f));
    }
    for (const [id, file] of Object.entries(contentBySubject)) {
      writeFileSync(join(CONTENT_OUT_DIR, `${id}.generated.json`), `${JSON.stringify(file)}\n`);
    }
    printReport(result);
    console.log(
      `  Wrote ${relative(ROOT, OUT_PATH)} and ${keep.size} content files in ${relative(ROOT, CONTENT_OUT_DIR)}`,
    );
  } catch (err) {
    if (err instanceof BuildError) {
      console.error(`✗ build-syllabus failed: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
