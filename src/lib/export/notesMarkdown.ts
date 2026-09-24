// Markdown export of notes (F22): concept notes, saved Claude answers and problem notes (insight,
// summary, my notes, latest approach), grouped by subject and topic in syllabus order.
import { conceptById, subjects, topicById, topicsBySubject } from "@/data/syllabus";
import { APP_NAME } from "@/lib/constants";
import type { ConceptNote, ProblemState } from "@/lib/types";
import { problemInfo, problemLabel, problemUrl } from "../problems/catalog";
import { attemptsInOrder } from "../problems/progress";

export function notesFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${APP_NAME.toLowerCase()}-notes-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.md`;
}

/** Shifts Markdown headings down so a note's own "# Title" nests under the export's headings. */
function nest(markdown: string, levels: number): string {
  let inFence = false;
  return markdown
    .trim()
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
      if (inFence) return line;
      return line.replace(
        /^(#{1,6})\s/,
        (_m, h: string) => `${"#".repeat(Math.min(6, h.length + levels))} `,
      );
    })
    .join("\n");
}

interface Entry {
  sort: number;
  body: string;
}

export function buildNotesMarkdown(
  notes: readonly ConceptNote[],
  problems: readonly ProblemState[],
  now: Date = new Date(),
): { markdown: string; count: number } {
  // topicId → entries
  const byTopic = new Map<string, Entry[]>();
  const add = (topicId: string, entry: Entry) => {
    const list = byTopic.get(topicId);
    if (list) list.push(entry);
    else byTopic.set(topicId, [entry]);
  };
  let count = 0;

  for (const note of notes) {
    const concept = conceptById.get(note.conceptId);
    const hasNote = note.markdown.trim().length > 0;
    if (!hasNote && note.savedAnswers.length === 0) continue;
    const parts = [`#### ${concept?.name ?? note.conceptId}`];
    if (hasNote) parts.push(nest(note.markdown, 4));
    for (const a of note.savedAnswers) {
      parts.push(`**Saved answer: ${a.question.trim()}**`, nest(a.answer, 4));
    }
    add(concept?.topicId ?? "", { sort: concept?.order ?? 0, body: parts.join("\n\n") });
    count++;
  }

  for (const state of problems) {
    const info = problemInfo(state.problemId, state);
    const latestApproach = attemptsInOrder(state)
      .reverse()
      .find((a) => a.approach?.trim())?.approach;
    const fields: [string, string | undefined][] = [
      ["Insight", state.insight],
      ["Summary", state.summary],
      ["My notes", state.myNotes],
      ["Latest approach", latestApproach],
    ];
    const present = fields.filter(([, v]) => v?.trim());
    if (!info || present.length === 0) continue;
    const url = problemUrl(info, state);
    const parts = [`#### Problem: ${problemLabel(info)}`];
    if (url) parts.push(url);
    for (const [label, value] of present) {
      const text = value!.trim();
      parts.push(
        text.includes("\n") ? `**${label}**\n\n${nest(text, 4)}` : `**${label}:** ${text}`,
      );
    }
    add(info.topicId ?? "", { sort: 10_000 + info.order, body: parts.join("\n\n") });
    count++;
  }

  const date = now.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const out: string[] = [`# ${APP_NAME} notes`, `Exported ${date}.`];
  if (count === 0) out.push("No notes yet.");
  for (const subject of subjects) {
    const topics = (topicsBySubject.get(subject.id) ?? []).filter((t) => byTopic.has(t.id));
    if (topics.length === 0) continue;
    out.push(`## ${subject.name}`);
    for (const topic of topics) {
      out.push(`### ${topic.name}`);
      const entries = byTopic.get(topic.id)!.sort((a, b) => a.sort - b.sort);
      out.push(...entries.map((e) => e.body));
    }
  }
  const loose = [...byTopic.entries()].filter(([id]) => !topicById.has(id));
  if (loose.length) {
    out.push("## Other");
    for (const [, entries] of loose) out.push(...entries.map((e) => e.body));
  }
  return { markdown: `${out.join("\n\n")}\n`, count };
}
