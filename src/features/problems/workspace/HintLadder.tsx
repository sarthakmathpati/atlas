// "I'm stuck" (F11): three hints revealed one at a time by explicit clicks (nudge, approach,
// pseudocode, with a warning before the last), and a separate "Show full solution" that asks
// first and marks the attempt as "saw the solution".
//
// Hints come from Claude (written for this problem and the code in the editor, and kept per
// problem and level so reopening costs nothing) or from the pattern's notes (offline). With
// Claude, the full solution is explained in the panel; the LeetCode editorial (or a quant
// puzzle's answer) is always there too.
import { ArrowUpRight, BookOpen, ChevronDown, Lightbulb, RotateCcw, X } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Misc";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { conceptById } from "@/data/syllabus";
import { fullSolutionPrompt, hintPrompt } from "@/lib/ai/prompts";
import { editorialUrl, type ProblemInfo } from "@/lib/problems/catalog";
import { buildOfflineHints, HINT_TITLES, type HintLevelNumber } from "@/lib/problems/hints";
import type { ProblemState } from "@/lib/types";
import { useAIMode } from "@/stores/aiStore";
import { useConceptContent } from "@/stores/contentStore";
import { saveHint } from "@/stores/problemStore";
import { fitPrompt, gatherContext, promptEnv } from "../../ai/gather";
import { AIMarkdown, AIRunView, ClaudeTag } from "../../ai/parts";
import { useAIRequest } from "../../ai/useAI";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));

const SHOW_LABEL: Record<HintLevelNumber, string> = {
  1: "Show a nudge",
  2: "Show the approach",
  3: "Show pseudocode",
};

type Source = "claude" | "notes";

interface HintLadderProps {
  info: ProblemInfo;
  state: ProblemState | undefined;
  hintsUsed: 0 | 1 | 2 | 3;
  sawSolution: boolean;
  /** The editor's code, so Claude's hints respond to where the owner is. */
  code: { language: string; code: string };
  /** A re-solve that hasn't been revealed: Claude doesn't see the old insight and notes. */
  hideOwnWork: boolean;
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
  code,
  hideOwnWork,
  onHint,
  onSolution,
  onClose,
  className,
}: HintLadderProps) {
  const { mode } = useAIMode();
  // Hints from Claude by default when answers stream in; copy prompt starts with the notes.
  const [source, setSource] = useState<Source>(mode === "copy" ? "notes" : "claude");
  // The offline ladder uses the first pattern's signals and template (loaded with its subject).
  const primary = info.conceptIds[0] ? conceptById.get(info.conceptIds[0]) : undefined;
  const { value: content, failed } = useConceptContent(primary);
  const ready = !primary || content !== undefined || failed;
  const levels = useMemo(() => buildOfflineHints(info, content), [info, content]);
  const cached = new Map((state?.hints ?? []).map((h) => [h.level, h]));
  const hint = useAIRequest();
  const solution = useAIRequest();
  const [pending, setPending] = useState<HintLevelNumber | null>(null);
  const [warn, setWarn] = useState(false);
  const [confirmSolution, setConfirmSolution] = useState(false);
  const editorial = editorialUrl(info, state);
  const hasAnswer = info.source === "quant" && info.answer !== undefined;
  const next = (hintsUsed + 1) as HintLevelNumber;

  const askClaude = (level: HintLevelNumber, refresh = false) => {
    setPending(level);
    void hint.start(
      async () =>
        fitPrompt(await gatherContext({ problemId: info.id, code, hideOwnWork }), (ctx) =>
          hintPrompt(promptEnv(), ctx, level),
        ),
      {
        refresh,
        title: `Hint ${level} for ${info.title}`,
        // Also after "Try again": keep the hint, count it, and show it from the cache.
        onDone: (result) => {
          saveHint(info.id, level, result.text);
          if (level > hintsUsed) onHint(level);
          hint.reset();
          setPending(null);
        },
      },
    );
  };

  const reveal = () => {
    if (next === 3 && !warn) {
      setWarn(true);
      return;
    }
    setWarn(false);
    if (source === "claude" && !cached.has(next)) askClaude(next);
    else onHint(next as 1 | 2 | 3);
  };

  const showSolution = () => {
    setConfirmSolution(false);
    onSolution();
    void solution.start(
      async () =>
        fitPrompt(await gatherContext({ problemId: info.id, code, hideOwnWork }), (ctx) =>
          fullSolutionPrompt(promptEnv(), ctx),
        ),
      { cacheKey: `full-solution:${info.id}`, title: `The full solution to ${info.title}` },
    );
  };

  const shown = ([1, 2, 3] as const).filter((l) => l <= hintsUsed);
  const busy = hint.busy;

  return (
    <section
      aria-label="Hints"
      className={cx(
        // A soft tray under the editor (12.10.8): rounded, sunken, no hairline.
        "mx-2 mt-2 flex min-h-0 flex-col rounded-panel bg-surface-sunken",
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-3.5 pt-2.5 pb-2">
        <Lightbulb size={16} aria-hidden="true" className="text-warning" />
        <h2 className="text-base font-semibold text-text">Hints</h2>
        <SegmentedControl<Source>
          label="Where hints come from"
          size="sm"
          value={source}
          onChange={setSource}
          options={[
            { value: "claude", label: "Claude" },
            { value: "notes", label: "Pattern notes" },
          ]}
        />
        <span className="ml-auto text-sm text-muted">
          {hintsUsed === 0 ? "None used" : `${hintsUsed} of 3 used`}
        </span>
        <IconButton icon={ChevronDown} label="Hide hints" size="sm" onClick={onClose} />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3.5 pb-3.5">
        {shown.map((level) => {
          const fromClaude = source === "claude" ? cached.get(level) : undefined;
          const offline = levels[level - 1]!;
          return (
            <div key={level} className="rounded-control bg-surface px-3 py-2.5">
              <p className="mb-1 flex items-center gap-2 text-sm font-medium text-muted">
                {level}. {HINT_TITLES[level]}
                {fromClaude && <ClaudeTag />}
              </p>
              {source === "claude" && !fromClaude ? (
                pending === level ? null : (
                  <Button size="sm" variant="ghost" onClick={() => askClaude(level)}>
                    {`Get hint ${level} from Claude`}
                  </Button>
                )
              ) : fromClaude ? (
                <>
                  <AIMarkdown compact>{fromClaude.text}</AIMarkdown>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={RotateCcw}
                    disabled={busy}
                    onClick={() => askClaude(level, true)}
                    className="mt-1 text-muted"
                  >
                    Ask again for my current code
                  </Button>
                </>
              ) : ready ? (
                <Suspense fallback={<Skeleton className="h-12 w-full" />}>
                  <MarkdownView compact>{offline.markdown}</MarkdownView>
                </Suspense>
              ) : (
                <Skeleton className="h-12 w-full" />
              )}
            </div>
          );
        })}
        {pending !== null && hint.state.phase !== "idle" && (
          <div className="rounded-control bg-surface px-3 py-2.5">
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-muted">
              {pending}. {HINT_TITLES[pending]} <ClaudeTag />
            </p>
            <AIRunView request={hint} compact />
          </div>
        )}
        {hasAnswer && sawSolution && (
          <div className="rounded-control bg-surface px-3 py-2.5">
            <p className="mb-1 text-sm font-medium text-muted">Answer</p>
            <p className="text-base font-medium text-text">
              {info.answer === null
                ? "Open-ended: check your reasoning against the note."
                : info.answer}
            </p>
            {info.answerNote && <p className="mt-1 text-base text-muted">{info.answerNote}</p>}
          </div>
        )}
        {solution.state.phase !== "idle" && (
          <div className="rounded-control bg-surface px-3 py-2.5">
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-muted">
              Full solution <ClaudeTag />
            </p>
            <AIRunView request={solution} compact />
          </div>
        )}
        {warn && (
          <div
            role="alert"
            className="rounded-control bg-warning-soft px-3 py-2.5 text-base text-text"
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
            <Button size="sm" variant="secondary" icon={Lightbulb} disabled={busy} onClick={reveal}>
              {source === "claude" ? `Get hint ${next}` : SHOW_LABEL[next]}
            </Button>
          )}
          {solution.state.phase === "idle" && !(hasAnswer && sawSolution && source === "notes") && (
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
          {source === "claude"
            ? "Claude writes each hint for this problem and the code in your editor, and never gives the whole solution. Hints you get are kept, so opening them again is free."
            : "These hints come from the pattern's notes and work offline."}
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
                onClick={() => {
                  setConfirmSolution(false);
                  onSolution();
                }}
              >
                Show the answer
              </Button>
            ) : (
              editorial && (
                <Button
                  href={editorial}
                  trailingIcon={ArrowUpRight}
                  onClick={() => {
                    setConfirmSolution(false);
                    onSolution();
                  }}
                >
                  Open the editorial
                </Button>
              )
            )}
            <Button variant="primary" onClick={showSolution}>
              Explain it with Claude
            </Button>
          </>
        }
      >
        <p className="px-4 py-4 text-base text-muted sm:px-5">
          This attempt will be saved as “saw the solution”, and the problem comes back tomorrow so
          you can solve it on your own.
          {!hasAnswer && editorial ? " The editorial opens on LeetCode in a new tab." : ""}
        </p>
      </Dialog>
    </section>
  );
}
