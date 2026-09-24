# Atlas content

This folder is the source of truth for the syllabus: 18 subjects, 146 topics and 909 concepts
(BUILD_SPEC.md section 6). `npm run build:syllabus` turns it into `src/data/syllabus.generated.json`
and checks it. Writing rules for every level are in BUILD_SPEC.md section 5.3.

## Files

- `<subject>/_subject.md`: one per subject (front matter only).
- `<subject>/<topic>.md`: one per topic. The file name is the topic id without the subject prefix
  (`dsa.graph-basics` → `dsa/graph-basics.md`).
- `connections.md`: cross-subject links (section 7.1), stored on both concepts.

## Topic file format

````markdown
---
topic: dsa.graph-basics
name: "Graphs: basics and traversal"
subject: dsa
order: 22
prereqs: [dsa.recursion, dsa.stacks-queues]
---

## dsa.graph-basics.bfs
name: "BFS"
importance: must
pattern: true
prereqs: [dsa.graph-basics.graph-representations]
scope: "shortest path in unweighted graphs, levels"

### simple
Two to four short sentences with one everyday analogy.

### interview
- Three to seven bullets: definition, key facts, complexity, when to use it, follow-ups, pitfalls.

### deep
A 300 to 900 word article (required for `importance: must`). Use `####` for sub-headings inside it.
Code in C++ first, then Python. Math with KaTeX: `$E[X]$`, `$$\sum_{i=1}^n i$$`.

### questions
Q: An interview-style question?
A: A short model answer (2 to 5 sentences). Three to five pairs.

### signals
- Patterns only: three to six phrases that hint a problem uses this pattern.

### template
```cpp
// Patterns only: a reusable C++ skeleton with comments.
```
````

## Concept metadata keys

| Key | Required | Meaning |
|---|---|---|
| `name` | yes | Display name, quoted. The id is `<topic id>.<slug of the name>`. |
| `importance` | yes | `must`, `important` or `advanced`. |
| `scope` | yes | What the content must cover (the text after the colon in section 6), quoted. |
| `pattern` | no | `true` for DSA technique concepts that problems attach to. |
| `tracks` | no | `[sde]`, `[quant]` or `[sde, quant]`; overrides the topic's tracks. |
| `prereqs` | no | Concept ids to learn first. Keep these sparse; the build rejects cycles. |
| `estMinutes` | no | Minutes to learn to interview level (default 25). |
| `needsReview` | no | `true` when a fact is uncertain; the app shows an "unverified" badge. |

Rules the build enforces: ids are unique, every prerequisite and connection resolves, the
prerequisite graphs have no cycles, and a concept never requires a concept from a topic that
comes later in the topic order. Only the six reserved `### simple|interview|deep|questions|signals|template`
headings start sections, and headings inside code fences are ignored.

Never change a concept id once people have progress on it. If you must, add the old id to
`idAliases` in `src/lib/storage/migrations.ts` so saved progress follows the concept.
