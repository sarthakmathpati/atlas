// The coverage matrix (F27): the 30 questions down the side, your stories across the top. A dot
// marks a link; clicking a cell links or unlinks (the same link the story editor edits).
// Questions with no story are highlighted, with a way to write one for them.
import { CircleAlert, Plus } from "lucide-react";
import { useMemo } from "react";
import { navigate, routeHref } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { EmptyState } from "@/components/ui/Misc";
import { BEHAVIORAL_QUESTIONS } from "@/data/behavioral.seed";
import { coverageMatrix } from "@/lib/stories/stories";
import type { Story } from "@/lib/types";
import { addStory, linkQuestion } from "@/stores/storyStore";

export function Coverage({ stories }: { stories: Story[] }) {
  const matrix = useMemo(() => coverageMatrix(stories, BEHAVIORAL_QUESTIONS), [stories]);
  const total = matrix.rows.length;

  const writeFor = (questionId: string, text: string) => {
    const id = addStory({ title: text.replace(/\?$/, ""), questionIds: [questionId] });
    navigate(routeHref("/stories", undefined, { story: id }));
  };

  return (
    <div className="space-y-4">
      <p className="text-base text-text" role="status">
        <span className="font-semibold tabular-nums">{matrix.covered}</span> of {total} questions
        have a story.
        {matrix.uncovered.length > 0 && (
          <span className="text-muted"> {matrix.uncovered.length} still need one.</span>
        )}
      </p>
      {matrix.stories.length === 0 ? (
        <EmptyState
          icon={Plus}
          drawing="tent"
          title="No stories yet"
          actions={
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => navigate(routeHref("/stories", undefined, { story: addStory() }))}
            >
              Write your first story
            </Button>
          }
        >
          Five or six strong stories can answer most of these questions. Write one, link the
          questions it answers, and this table fills in.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-panel bg-surface">
          <table className="w-full border-collapse text-sm" aria-label="Questions and your stories">
            <thead>
              <tr className="border-b border-rule">
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-56 bg-surface px-3 py-2 text-left font-medium text-muted max-sm:min-w-44"
                >
                  Question
                </th>
                {matrix.stories.map((s) => (
                  <th
                    key={s.id}
                    scope="col"
                    className="min-w-24 px-2 py-2 align-bottom font-medium"
                  >
                    <a
                      href={routeHref("/stories", undefined, { story: s.id })}
                      title={s.title}
                      className="line-clamp-2 block max-w-28 text-left text-text hover:text-accent hover:underline"
                    >
                      {s.title}
                    </a>
                    <span className="text-xs font-normal text-muted tabular-nums">
                      {matrix.perStory[s.id] ?? 0}{" "}
                      {(matrix.perStory[s.id] ?? 0) === 1 ? "question" : "questions"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr
                  key={row.question.id}
                  className={cx(
                    "border-b border-rule last:border-b-0",
                    !row.covered && "bg-warning-soft",
                  )}
                >
                  <th
                    scope="row"
                    className={cx(
                      "sticky left-0 z-10 px-3 py-2 text-left font-normal text-text",
                      row.covered
                        ? "bg-surface"
                        : "bg-[color-mix(in_srgb,var(--warning)_12%,var(--surface))]",
                    )}
                  >
                    <span className="block">{row.question.text}</span>
                    {!row.covered && (
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-warning">
                          <CircleAlert size={12} aria-hidden="true" />
                          No story yet
                        </span>
                        <button
                          type="button"
                          onClick={() => writeFor(row.question.id, row.question.text)}
                          className="text-xs text-accent hover:underline"
                        >
                          Write one
                        </button>
                      </span>
                    )}
                  </th>
                  {matrix.stories.map((s) => {
                    const linked = row.storyIds.includes(s.id);
                    return (
                      <td key={s.id} className="px-2 py-1 text-center">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={linked}
                          aria-label={`${s.title} answers “${row.question.text}”`}
                          onClick={() => linkQuestion(s.id, row.question.id, !linked)}
                          className="grid size-9 place-items-center rounded-control hover:bg-surface-sunken"
                        >
                          <span
                            aria-hidden="true"
                            className={cx(
                              "size-3.5 rounded-full border",
                              linked ? "border-accent bg-accent" : "border-rule-strong",
                            )}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-muted">
        Click a circle to link a story to a question, or to unlink it. The story's page shows the
        same links.
      </p>
    </div>
  );
}
