// The Notes tab (F3): the owner's Markdown notes for the concept (autosaved, with a live preview:
// side by side when there is room, Write | Preview otherwise), answers saved from Claude, and the
// history of "Explain it back" attempts (F13).
import { ArrowDownToLine, Trash2 } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Misc";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { relativeDate } from "@/lib/problems/progress";
import { localDate } from "@/lib/time";
import type { Check, Concept } from "@/lib/types";
import {
  deleteSavedAnswer,
  moveAnswerIntoNote,
  restoreNote,
  restoreSavedAnswer,
  setNoteMarkdown,
  useConceptNoteStore,
} from "@/stores/conceptNoteStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { toast } from "@/stores/toastStore";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));

const EMPTY: Check[] = [];

interface ExplainDetail {
  mode?: string;
  text?: string;
  covered?: string[];
  missed?: string[];
}

function Preview({ markdown }: { markdown: string }) {
  return markdown.trim() ? (
    <Suspense fallback={<Skeleton className="h-24 w-full" />}>
      <MarkdownView>{markdown}</MarkdownView>
    </Suspense>
  ) : (
    <p className="text-base text-faint">Nothing to preview yet.</p>
  );
}

export function NotesTab({ concept, wide }: { concept: Concept; wide: boolean }) {
  const note = useConceptNoteStore((s) => s.notes[concept.id]);
  const checks = useConceptStateStore((s) => s.checks[concept.id] ?? EMPTY);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const markdown = note?.markdown ?? "";
  const answers = note?.savedAnswers ?? [];
  const explanations = checks.filter((c) => c.kind === "explain").reverse();
  const today = localDate();

  const editor = (
    <Textarea
      aria-label={`Notes on ${concept.name}`}
      rows={wide ? 14 : 10}
      value={markdown}
      onChange={(e) => setNoteMarkdown(concept.id, e.target.value)}
      placeholder="Your own words: the idea, a small example, the traps. Markdown works: **bold**, lists, `code`, $math$."
      className="font-normal"
    />
  );

  return (
    <div className="space-y-6">
      <section aria-labelledby={`${concept.id}-note`} className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id={`${concept.id}-note`} className="text-base font-semibold text-text">
            Your notes
          </h3>
          {!wide && (
            <SegmentedControl<"write" | "preview">
              label="Notes view"
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { value: "write", label: "Write" },
                { value: "preview", label: "Preview" },
              ]}
            />
          )}
        </div>
        {wide ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {editor}
            <div className="min-h-40 rounded-control border border-rule bg-surface px-3 py-2">
              <Preview markdown={markdown} />
            </div>
          </div>
        ) : mode === "write" ? (
          editor
        ) : (
          <div className="min-h-40 rounded-control border border-rule bg-surface px-3 py-2">
            <Preview markdown={markdown} />
          </div>
        )}
        <p className="text-sm text-muted">Saved as you type, on this device and in your backups.</p>
      </section>

      <section aria-labelledby={`${concept.id}-answers`}>
        <h3 id={`${concept.id}-answers`} className="mb-2 text-base font-semibold text-text">
          Saved answers ({answers.length})
        </h3>
        {answers.length === 0 ? (
          <p className="text-base text-muted">
            Answers from Claude that you choose to keep appear here. Asking Claude arrives in phase
            6.
          </p>
        ) : (
          <ul className="divide-y divide-rule rounded-control border border-rule">
            {answers.map((a) => (
              <li key={a.id} className="px-3 py-2">
                <details>
                  <summary className="cursor-pointer font-medium text-text">{a.question}</summary>
                  <div className="mt-2">
                    <Preview markdown={a.answer} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      icon={ArrowDownToLine}
                      onClick={() => {
                        const before = moveAnswerIntoNote(concept.id, a.id);
                        if (before)
                          toast("Answer moved into your notes.", {
                            action: { label: "Undo", onClick: () => restoreNote(before) },
                          });
                      }}
                    >
                      Move into notes
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => {
                        const removed = deleteSavedAnswer(concept.id, a.id);
                        if (removed)
                          toast("Answer deleted.", {
                            action: {
                              label: "Undo",
                              onClick: () =>
                                restoreSavedAnswer(concept.id, removed.answer, removed.index),
                            },
                          });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={`${concept.id}-explained`}>
        <h3 id={`${concept.id}-explained`} className="mb-2 text-base font-semibold text-text">
          Your explanations ({explanations.length})
        </h3>
        {explanations.length === 0 ? (
          <p className="text-base text-muted">
            Each time you explain it back, your explanation and score are kept here.
          </p>
        ) : (
          <ul className="divide-y divide-rule rounded-control border border-rule">
            {explanations.map((c) => {
              const d = (c.detail ?? {}) as ExplainDetail;
              return (
                <li key={c.id} className="px-3 py-2">
                  <details>
                    <summary className="cursor-pointer text-base text-text">
                      {relativeDate(localDate(new Date(c.createdAt)), today)}:{" "}
                      <span className="font-medium">{Math.round(c.score * 100)}%</span>
                      {d.mode === "self" && <span className="text-muted"> (self-check)</span>}
                    </summary>
                    {d.text && (
                      <p className="mt-2 whitespace-pre-wrap text-base text-text">{d.text}</p>
                    )}
                    {d.missed && d.missed.length > 0 && (
                      <p className="mt-2 text-sm text-muted">Missed: {d.missed.join("; ")}</p>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
