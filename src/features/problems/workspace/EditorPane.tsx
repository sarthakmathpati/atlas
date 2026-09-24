// The workspace's code side (F7 right pane): language picker, starter template toggle, draft
// status and the attempt timer above the editor; the hint ladder below it when open; and the
// actions: I'm stuck, Review my code, Dry run (Claude, phase 6), Discard draft, Save attempt.
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
import type { ProblemInfo } from "@/lib/problems/catalog";
import type { ProblemState } from "@/lib/types";
import { LaterClaudeButton } from "../parts";
import { HintLadder } from "./HintLadder";
import { isBlankCode, starterTemplate } from "./templates";
import type { AttemptSession } from "./useAttemptSession";

const CodeEditor = lazy(() => import("@/components/ui/code/CodeEditor"));

interface EditorPaneProps {
  info: ProblemInfo;
  state: ProblemState | undefined;
  attempt: AttemptSession;
  autoStart: boolean;
  templateOn: boolean;
  onTemplateChange: (on: boolean) => void;
  hintsOpen: boolean;
  onHintsOpen: (open: boolean) => void;
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
  hintsOpen,
  onHintsOpen,
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
    <div className={cx("flex min-h-0 flex-col", fill && "h-full")}>
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
        <Timer timer={timer} label="Attempt timer" className="max-sm:ml-auto" />
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
      {hintsOpen && (
        <HintLadder
          info={info}
          state={state}
          hintsUsed={session.hintsUsed}
          sawSolution={session.sawSolution}
          onHint={(level) => update({ hintsUsed: Math.max(session.hintsUsed, level) as 1 | 2 | 3 })}
          onSolution={() => update({ sawSolution: true })}
          onClose={() => onHintsOpen(false)}
          className="max-h-[45%] shrink-0"
        />
      )}
      <div
        className={cx(
          "flex shrink-0 flex-wrap items-center gap-2 border-t border-rule bg-surface px-3 py-2",
          !fill && "sticky bottom-0 z-10",
        )}
      >
        <Button
          size="sm"
          icon={LifeBuoy}
          aria-expanded={hintsOpen}
          onClick={() => onHintsOpen(!hintsOpen)}
          disabled={disabled}
        >
          I'm stuck
        </Button>
        <LaterClaudeButton
          compactOnMobile
          size="sm"
          label="Review my code"
          title="Review my code"
          icon={Bug}
        >
          <p>
            Claude will read your code for this problem and point out bugs, missed edge cases,
            complexity and style, then suggest mistake tags for the attempt.
          </p>
        </LaterClaudeButton>
        {info.source !== "quant" && (
          <LaterClaudeButton compactOnMobile size="sm" label="Dry run" title="Dry run" icon={Play}>
            <p>
              Give an input and Claude will trace your code step by step, showing the variables at
              each step and the output, so you can see where it goes wrong.
            </p>
            <p>
              Atlas doesn't run C++ or Java itself; test on LeetCode and save the final code here.
            </p>
          </LaterClaudeButton>
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
