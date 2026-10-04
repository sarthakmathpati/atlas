// The workspace's code side (F7 right pane): language picker, starter template toggle, draft
// status and the attempt timer above the editor; one panel below it when open (hints, Claude's
// code review or a dry run); and the actions: I'm stuck, Review my code, Dry run, Discard draft,
// Save attempt.
import { Bug, FileCode2, LifeBuoy, Play, Save, Undo2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import {
  CODE_LANGUAGE_LABEL,
  EDITOR_LANGUAGES,
  type CodeLanguage,
} from "@/components/ui/code/languages";
import { cx } from "@/components/ui/cx";
import { Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Misc";
import { Timer } from "@/components/ui/Timer";
import { WorkspaceDisc } from "@/features/adhd/WorkspaceDisc";
import type { ProblemInfo } from "@/lib/problems/catalog";
import type { ProblemState } from "@/lib/types";
import { DryRunPanel, ReviewPanel } from "./ClaudePanels";
import { HintLadder } from "./HintLadder";
import { isBlankCode, starterTemplate } from "./templates";
import type { AttemptSession } from "./useAttemptSession";

const CodeEditor = lazy(() => import("@/components/ui/code/CodeEditor"));

export type WorkspacePanel = "hints" | "review" | "dryrun" | null;

interface EditorPaneProps {
  info: ProblemInfo;
  state: ProblemState | undefined;
  attempt: AttemptSession;
  autoStart: boolean;
  templateOn: boolean;
  onTemplateChange: (on: boolean) => void;
  panel: WorkspacePanel;
  onPanel: (panel: WorkspacePanel) => void;
  /** A re-solve that hasn't been revealed: Claude doesn't see the old insight and notes. */
  hideOwnWork: boolean;
  onSave: () => void;
  onDiscard: () => void;
  /** Fills the height of its container (desktop split); otherwise a tall block. */
  fill: boolean;
  disabled?: boolean;
}

export function EditorPane({
  info,
  state,
  attempt,
  autoStart,
  templateOn,
  onTemplateChange,
  panel,
  onPanel,
  hideOwnWork,
  onSave,
  onDiscard,
  fill,
  disabled,
}: EditorPaneProps) {
  const { session, update, timer, draftState } = attempt;
  const blank = isBlankCode(session.code, session.language);

  const changeLanguage = (language: CodeLanguage) => {
    // An untouched template follows the language; the owner's own code is kept as it is.
    const code = blank && templateOn ? starterTemplate(language) : blank ? "" : session.code;
    update({ language, code });
  };

  const toggleTemplate = () => {
    const on = !templateOn;
    onTemplateChange(on);
    if (on && session.code.trim() === "") update({ code: starterTemplate(session.language) });
    if (!on && session.code.trim() === starterTemplate(session.language).trim())
      update({ code: "" });
  };

  const draftLabel =
    draftState === "saving" ? "Saving draft" : draftState === "saved" ? "Draft saved" : "";

  return (
    <div className={cx("flex min-h-0 flex-col bg-surface", fill && "h-full")}>
      <div className="flex shrink-0 flex-nowrap items-center gap-2 border-b border-rule px-3 py-2">
        <Select
          aria-label="Language"
          value={session.language}
          onChange={(e) => changeLanguage(e.target.value as CodeLanguage)}
          options={EDITOR_LANGUAGES.map((l) => ({ value: l, label: CODE_LANGUAGE_LABEL[l] }))}
          className="w-28 sm:w-36"
          disabled={disabled}
        />
        <Button
          size="sm"
          variant="ghost"
          icon={FileCode2}
          aria-pressed={templateOn}
          onClick={toggleTemplate}
          disabled={disabled}
          className={cx(templateOn && "bg-accent-soft")}
        >
          <span className="max-sm:sr-only">Template</span>
        </Button>
        <span
          className="ml-auto text-sm text-muted max-sm:sr-only"
          role="status"
          aria-live="polite"
        >
          {draftLabel}
        </span>
        {/* ADHD mode's disc (F32) beside the clock: the time planned, shrinking. */}
        <span className="flex items-center gap-1 max-sm:ml-auto">
          <WorkspaceDisc info={info} timer={timer} />
          <Timer timer={timer} label="Attempt timer" large />
        </span>
      </div>
      <div className={cx("min-h-0 bg-code", fill ? "flex-1" : "h-[56vh] min-h-[300px]")}>
        <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
          <CodeEditor
            value={session.code}
            onChange={(code) => update({ code })}
            language={session.language}
            label={`Code for ${info.title}`}
            readOnly={disabled}
            placeholder={
              info.source === "quant"
                ? "Your idea, the steps, the answer."
                : "Write your solution here."
            }
            height="100%"
            minHeight="100%"
            className="h-full rounded-none border-0"
            onFirstEdit={() => attempt.began(autoStart)}
          />
        </Suspense>
      </div>
      {panel === "hints" && (
        <HintLadder
          info={info}
          state={state}
          hintsUsed={session.hintsUsed}
          sawSolution={session.sawSolution}
          code={{ language: session.language, code: session.code }}
          hideOwnWork={hideOwnWork}
          onHint={(level) => update({ hintsUsed: Math.max(session.hintsUsed, level) as 1 | 2 | 3 })}
          onSolution={() => update({ sawSolution: true })}
          onClose={() => onPanel(null)}
          className="max-h-[45%] shrink-0"
        />
      )}
      {panel === "review" && (
        <ReviewPanel
          info={info}
          code={{ language: session.language, code: session.code }}
          hideOwnWork={hideOwnWork}
          review={session.review}
          reviewedCode={session.reviewedCode}
          pendingTagIds={session.pendingTagIds}
          currentInsight={state?.insight}
          onReviewed={(review, code) => update({ review, reviewedCode: code })}
          onAddTag={(tagId) =>
            update({ pendingTagIds: [...new Set([...session.pendingTagIds, tagId])] })
          }
          onClose={() => onPanel(null)}
          className="max-h-[55%] shrink-0"
        />
      )}
      {panel === "dryrun" && (
        <DryRunPanel
          info={info}
          code={{ language: session.language, code: session.code }}
          hideOwnWork={hideOwnWork}
          dryRuns={session.dryRuns}
          onDryRun={(run) => update({ dryRuns: [...session.dryRuns, run].slice(-10) })}
          onClose={() => onPanel(null)}
          className="max-h-[55%] shrink-0"
        />
      )}
      <div
        className={cx(
          // A container: labels shrink to icons when the pane is narrow, not only the screen.
          "@container flex shrink-0 flex-wrap items-center gap-2 border-t border-rule bg-surface px-3 py-2",
          !fill && "sticky bottom-0 z-10",
        )}
      >
        <Button
          size="sm"
          icon={LifeBuoy}
          aria-expanded={panel === "hints"}
          onClick={() => onPanel(panel === "hints" ? null : "hints")}
          disabled={disabled}
        >
          I'm stuck
        </Button>
        <Button
          size="sm"
          icon={Bug}
          aria-expanded={panel === "review"}
          onClick={() => onPanel(panel === "review" ? null : "review")}
          disabled={disabled}
          className="@max-2xl:px-2.5"
          title="Review my code"
        >
          <span className="@max-2xl:sr-only">Review my code</span>
        </Button>
        {info.source !== "quant" && (
          <Button
            size="sm"
            icon={Play}
            aria-expanded={panel === "dryrun"}
            onClick={() => onPanel(panel === "dryrun" ? null : "dryrun")}
            disabled={disabled}
            className="@max-2xl:px-2.5"
            title="Dry run"
          >
            <span className="@max-2xl:sr-only">Dry run</span>
          </Button>
        )}
        <span className="flex-1" />
        {draftState !== "none" && (
          <Button size="sm" variant="ghost" icon={Undo2} onClick={onDiscard} disabled={disabled}>
            Discard
          </Button>
        )}
        <Button size="sm" variant="primary" icon={Save} onClick={onSave} disabled={disabled}>
          Save attempt
        </Button>
      </div>
    </div>
  );
}
