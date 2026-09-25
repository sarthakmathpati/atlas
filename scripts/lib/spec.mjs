// Parses the syllabus (section 6) and connections (section 7) straight out of BUILD_SPEC.md.
// Used by tests/syllabus-spec.test.ts to prove that content/ (and therefore the generated
// syllabus) still matches the spec exactly: every subject, topic and concept, with the same
// names, scopes, importance, tracks and pattern flags.

/** Concept id slug (CLAUDE.md, "Decisions"): lowercase, apostrophes dropped, "++" -> "pp",
 *  "+" -> "plus", "*" -> "star", every other run of non-alphanumeric characters becomes one hyphen.
 *  "Dijkstra's algorithm" -> "dijkstras-algorithm", "0/1 knapsack" -> "0-1-knapsack",
 *  "TCP/IP model" -> "tcp-ip-model", "A* search" -> "a-star-search", "B+ trees" -> "b-plus-trees". */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/\+\+/g, "pp")
    .replace(/\+/g, " plus ")
    .replace(/\*/g, " star ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const IMPORTANCE = { M: "must", I: "important", A: "advanced" };
const TRACK_WORDS = new Set(["sde", "quant"]);

function sectionText(spec, startHeading, endHeading) {
  const start = spec.indexOf(startHeading);
  if (start < 0) throw new Error(`Heading not found in spec: ${startHeading}`);
  const end = spec.indexOf(endHeading, start + startHeading.length);
  return spec.slice(start, end < 0 ? undefined : end);
}

function parseMetaLine(line) {
  // "id: dsa | tracks: sde, quant | icon: git-branch"
  const meta = {};
  for (const part of line.split("|")) {
    const i = part.indexOf(":");
    if (i < 0) continue;
    meta[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return meta;
}

function parseList(value) {
  if (!value || value === "none") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parses one concept bullet: "- [M] (pattern) Kadane's algorithm: maximum subarray sum ...".
 *  "(id: old-slug)" keeps an older id after a rename. */
export function parseConceptBullet(line) {
  const m = line.match(/^- \[([MIA])\]\s*(.*)$/);
  if (!m) return null;
  let rest = m[2];
  let tracks = null;
  let isPattern = false;
  let idSlug = null;
  for (;;) {
    const tag = rest.match(/^\(([^)]*)\)\s*/);
    if (!tag) break;
    const words = tag[1].split(",").map((w) => w.trim());
    const kept = tag[1].match(/^id:\s*([a-z0-9-]+)$/);
    if (kept) idSlug = kept[1]; // "(id: old-slug)": the id kept after a rename
    else if (words.length === 1 && words[0] === "pattern") isPattern = true;
    else if (words.every((w) => TRACK_WORDS.has(w))) tracks = words;
    else break; // a parenthesis that is part of the name
    rest = rest.slice(tag[0].length);
  }
  const colon = rest.indexOf(":");
  const name = (colon < 0 ? rest : rest.slice(0, colon)).trim();
  const scope = (colon < 0 ? rest : rest.slice(colon + 1)).trim();
  return { importance: IMPORTANCE[m[1]], tracks, isPattern, idSlug, name, scope };
}

/** Returns subjects with nested topics and concepts, in spec order. */
export function parseSpecSyllabus(spec) {
  const text = sectionText(spec, "## 6. The complete syllabus", "## 7. Connections");
  const lines = text.split("\n");
  const subjects = [];
  let subject = null;
  let topic = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const subjectHead = line.match(/^### (\d+)\. (.+)$/);
    if (subjectHead) {
      const meta = parseMetaLine(lines[i + 1] ?? "");
      subject = {
        id: meta.id,
        name: subjectHead[2].trim(),
        order: Number(subjectHead[1]),
        tracks: parseList(meta.tracks),
        icon: meta.icon,
        topics: [],
      };
      subjects.push(subject);
      topic = null;
      continue;
    }
    const topicHead = line.match(/^#### (.+)$/);
    if (topicHead && subject) {
      const meta = parseMetaLine(lines[i + 1] ?? "");
      topic = {
        id: meta.id,
        name: topicHead[1].trim(),
        order: subject.topics.length + 1,
        prereqs: parseList(meta.prereqs),
        concepts: [],
      };
      subject.topics.push(topic);
      continue;
    }
    if (line.startsWith("- [") && topic) {
      const concept = parseConceptBullet(line);
      if (concept) {
        concept.order = topic.concepts.length + 1;
        concept.id = `${topic.id}.${concept.idSlug ?? slugify(concept.name)}`;
        topic.concepts.push(concept);
      }
    }
  }
  return subjects;
}

/** "dsa.bst › Self-balancing BSTs overview" -> { topicId, name } */
export function parseConceptRef(ref) {
  const parts = ref.split("›").map((s) => s.trim());
  if (parts.length !== 2) throw new Error(`Bad concept reference: "${ref}"`);
  return { topicId: parts[0], name: parts[1] };
}

/** Parses the section 7.1 table: [{ from: {topicId, name}, to: {topicId, name}, reason }]. */
export function parseSpecConnections(spec) {
  const text = sectionText(spec, "### 7.1 Cross-subject links", "### 7.2");
  return parseConnectionTable(text);
}

/** Parses a markdown table with rows "| topic › Name | topic › Name | Reason |". */
export function parseConnectionTable(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("|") || !line.includes("›")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 3) continue;
    rows.push({ from: parseConceptRef(cells[0]), to: parseConceptRef(cells[1]), reason: cells[2] });
  }
  return rows;
}
