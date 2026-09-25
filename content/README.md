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
Code in C++ only. Math with KaTeX: `$E[X]$`, `$$\sum_{i=1}^n i$$`.

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
headings start sections (any other `###` heading fails the build; use `####` inside a deep
article), and headings inside code fences are ignored.

## Writing conventions

- **simple**: 2 to 4 sentences with an everyday analogy. Avoid abbreviations with dots (e.g., i.e.,
  vs.) because the sentence counter reads them as sentence ends.
- **interview**: 3 to 7 bullets, Markdown allowed.
- **deep** (must-know): 300 to 900 words including code, with `####` sections such as Intuition,
  Worked example, Code, Complexity, Edge cases and bugs, Variants, and a closing "Connects to:" line.
- **questions**: 3 to 5 `Q:`/`A:` pairs in plain text (no backticks, `$` or bold: the app shows
  them without Markdown). A question ends with `?` or `.`.
- **signals** (patterns): 3 to 6 plain-text bullets. The first one is the hint ladder's clue, so it
  must not contain the pattern's name.
- **template** (patterns): one fenced code block, C++ first.
- **Code**: C++ (C++20) only. The owner studies in C++, so no Python or Java code and no
  comparisons with them in any text (names, scopes, bullets, questions); explain ideas through
  C++ and its standard library. The `lang` subject's Java and Python topics are the only
  exception, and `tests/syllabus/content.test.ts` enforces the rule everywhere else. Every `cpp`
  block must compile: run `npm run check:content-code -- <subject>`. The checker provides
  `bits/stdc++.h`, POSIX and Linux headers, `using namespace std`, `ListNode` and `TreeNode`.
  Start a block with `// sketch` when it is deliberately partial. Run the snippets against their worked examples before committing.
  Keep code lines within 100 characters (the reading column fits about 80 before it scrolls),
  and never put a real URL in content: the artifact build rejects unknown URLs. When an example
  needs one, use `example.com`, `example.org` or `example.net` (reserved for documentation) inside
  code, and the documentation ranges 192.0.2.0/24, 198.51.100.0/24 and 203.0.113.0/24 for public
  IP addresses.
- **SQL** (`sql` blocks): write for MySQL 8, the app's SQL dialect, and run every query on a real
  MySQL 8 and PostgreSQL 16. Make each article's examples self-contained (create the tables they
  use), show output as a Markdown table after a line starting "Result:" (or "Result: no rows."),
  end a statement that must fail with a `-- error ...` comment, start a PostgreSQL-only block with
  `-- PostgreSQL`, and say where the two databases differ. Use original tables and data.
- When a subject is complete, add it to `FINISHED` in `tests/syllabus/content.test.ts`.

Never change a concept id once people have progress on it. To rename a concept, change its
`name:`, keep its id, and add `renamed: true` (the spec bullet gets `(id: old-slug)`). If the id
really must change, add the old id to `ID_ALIASES` in `src/lib/storage/migrations.ts` so saved
progress follows the concept.
