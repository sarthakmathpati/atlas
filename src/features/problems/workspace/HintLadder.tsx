// "I'm stuck" (F11): three hints revealed one at a time by explicit clicks (nudge, approach,
// pseudocode, with a warning before the last), and a separate "Show full solution" that asks
// first and marks the attempt as "saw the solution". Offline, the ladder comes from the pattern's
// notes; without Claude the full solution is the LeetCode editorial (or a quant puzzle's answer).
import { ArrowUpRight, BookOpen, ChevronDown, Lightbulb, X } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Misc";
import { conceptById } from "@/data/syllabus";
import { editorialUrl, type ProblemInfo } from "@/lib/problems/catalog";
import { buildOfflineHints, type HintLevelNumber } from "@/lib/problems/hints";
import type { ProblemState } from "@/lib/types";
import { useConceptContent } from "@/stores/contentStore";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));

const SHOW_LABEL: Record<HintLevelNumber, string> = {
  1: "Show a nudge",
  2: "Show the approach",
  3: "Show pseudocode",
};

interface HintLadderProps {
  info: ProblemInfo;
  state: ProblemState | undefined;
  hintsUsed: 0 | 1 | 2 | 3;
  sawSolution: boolean;
  onHint: (level: 1 | 2 | 3) => void;
  onSolution: () => void;
  onClose: () => void;
  className?: string;
}

export function HintLadder({
  info,
  state,
  hintsUsed,
  sawSolution,
  onHint,
  onSolution,
  onClose,
  className,
}: HintLadderProps) {
  // The ladder uses the first pattern's signals and template, which load with its subject's text.
  const primary = info.conceptIds[0] ? conceptById.get(info.conceptIds[0]) : undefined;
  const { value: content, failed } = useConceptContent(primary);
  const ready = !primary || content !== undefined || failed;
  const levels = useMemo(() => buildOfflineHints(info, content), [info, content]);
  const [warn, setWarn] = useState(false);
  const [confirmSolution, setConfirmSolution] = useState(false);
  const editorial = editorialUrl(info, state);
  const hasAnswer = info.source === "quant" && info.answer !== undefined;
  const next = (hintsUsed + 1) as HintLevelNumber;

  const reveal = () => {
    if (next === 3 && !warn) {
      setWarn(true);
      return;
    }
    setWarn(false);
    onHint(next as 1 | 2 | 3);
  };

  return (
    <section
      aria-label="Hints"
      className={cx("flex min-h-0 flex-col border-t border-rule bg-surface", className)}
    >
      <div className="flex shrink-0 items-center gap-2 px-3 py-2">
        <Lightbulb size={16} aria-hidden="true" className="text-warning" />
        <h2 className="flex-1 text-base font-semibold text-text">Hints</h2>
        <span className="text-sm text-muted">
          {hintsUsed === 0 ? "None used" : `${hintsUsed} of 3 used`}
        </span>
        <IconButton icon={ChevronDown} label="Hide hints" size="sm" onClick={onClose} />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
        {levels.slice(0, hintsUsed).map((l) => (
          <div key={l.level} className="rounded-control border border-rule bg-canvas px-3 py-2.5">
            <p className="mb-1 text-sm font-medium text-muted">
              {l.level}. {l.title}
            </p>
            {ready ? (
              <Suspense fallback={<Skeleton className="h-12 w-full" />}>
                <MarkdownView compact>{l.markdown}</MarkdownView>
              </Suspense>
            ) : (
              <Skeleton className="h-12 w-full" />
            )}
          </div>
        ))}
        {hasAnswer && sawSolution && (
          <div className="rounded-control border border-rule bg-canvas px-3 py-2.5">
            <p className="mb-1 text-sm font-medium text-muted">Answer</p>
            <p className="text-base font-medium text-text">
              {info.answer === null
                ? "Open-ended: check your reasoning against the note."
                : info.answer}
            </p>
            {info.answerNote && <p className="mt-1 text-base text-muted">{info.answerNote}</p>}
          </div>
        )}
        {warn && (
          <div
            role="alert"
            className="rounded-control border border-rule bg-warning-soft px-3 py-2.5 text-base text-text"
          >
            The pseudocode gives away most of the solution. Try a few more minutes with the approach
            first?
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={reveal}>
                Show it anyway
              </Button>
              <Button size="sm" variant="ghost" icon={X} onClick={() => setWarn(false)}>
                Not yet
              </Button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {hintsUsed < 3 && !warn && (
            <Button size="sm" variant="secondary" icon={Lightbulb} onClick={reveal}>
              {SHOW_LABEL[next]}
            </Button>
          )}
          {(editorial || hasAnswer) && !(hasAnswer && sawSolution) && (
            <Button
              size="sm"
              variant="ghost"
              icon={BookOpen}
              onClick={() => setConfirmSolution(true)}
            >
              Show full solution
            </Button>
          )}
        </div>
        <p className="text-sm text-muted">
          Hints come from the pattern's notes. Hints written by Claude for this exact problem arrive
          in phase 6.
        </p>
      </div>
      <Dialog
        open={confirmSolution}
        onClose={() => setConfirmSolution(false)}
        title="Show the full solution?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmSolution(false)}>
              Keep trying
            </Button>
            {hasAnswer ? (
              <Button
                variant="primary"
                onClick={() => {
                  setConfirmSolution(false);
                  onSolution();
                }}
              >
                Show the answer
              </Button>
            ) : (
              <Button
                variant="primary"
                href={editorial!}
                trailingIcon={ArrowUpRight}
                onClick={() => {
                  setConfirmSolution(false);
                  onSolution();
                }}
              >
                Open the editorial
              </Button>
            )}
          </>
        }
      >
        <p className="px-4 py-4 text-base text-muted sm:px-5">
          This attempt will be saved as “saw the solution”, and the problem comes back tomorrow so
          you can solve it on your own.
          {!hasAnswer && " The editorial opens on LeetCode in a new tab."}
        </p>
      </Dialog>
    </section>
  );
}
