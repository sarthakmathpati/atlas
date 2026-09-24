// Save attempt (F7): the result as four large buttons (hints and a revealed solution preselect
// and limit the honest choices), minutes from the timer, complexities, approach notes, mistake
// tags with search (new tags can be added on the spot), and the insight, which the dialog asks
// for on the first successful solve but never forces.
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { MultiCombobox, type ComboOption } from "@/components/ui/MultiCombobox";
import { CATEGORY_LABEL } from "@/lib/mistakes/stats";
import { problemLabel, type ProblemInfo } from "@/lib/problems/catalog";
import { RESULT_LABEL, RESULT_ORDER } from "@/lib/problems/progress";
import type { AttemptResult, ProblemState } from "@/lib/types";
import { addMistakeTag, useMistakeTagStore } from "@/stores/mistakeTagStore";
import { saveAttempt, type SavedAttempt } from "@/stores/problemStore";
import { toast } from "@/stores/toastStore";
import { RESULT_ICON, RESULT_TONE } from "../problemUi";
import type { Session } from "./useAttemptSession";

const RESULT_HELP: Record<AttemptResult, string> = {
  solved_alone: "No hints, no peeking.",
  solved_with_hints: "Hints or help along the way.",
  saw_solution: "You read a solution or your old notes.",
  not_solved: "Not there yet. It comes back tomorrow.",
};

interface SaveAttemptDialogProps {
  open: boolean;
  onClose: () => void;
  info: ProblemInfo;
  state: ProblemState | undefined;
  session: Session;
  elapsedMs: number;
  mode: "normal" | "resolve";
  /** Whether the insight may be shown (hidden during a re-solve until revealed). */
  insightVisible: boolean;
  onSaved: (saved: SavedAttempt) => void;
}

function defaultResult(session: Session): AttemptResult | null {
  if (session.sawSolution) return "saw_solution";
  if (session.hintsUsed > 0) return "solved_with_hints";
  return null;
}

export function SaveAttemptDialog(props: SaveAttemptDialogProps) {
  // The body mounts fresh each time the dialog opens, so its fields start from the attempt.
  const { open, onClose } = props;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Save attempt"
      description={problemLabel(props.info)}
      size="md"
      closeOnBackdrop={false}
    >
      {open && <SaveAttemptForm {...props} />}
    </Dialog>
  );
}

function SaveAttemptForm({
  onClose,
  info,
  state,
  session,
  elapsedMs,
  mode,
  insightVisible,
  onSaved,
}: SaveAttemptDialogProps) {
  const tags = useMistakeTagStore((s) => s.tags);
  const [result, setResult] = useState<AttemptResult | null>(() => defaultResult(session));
  const [minutes, setMinutes] = useState(() =>
    elapsedMs > 0 ? String(Math.max(1, Math.round(elapsedMs / 60_000))) : "",
  );
  const [time, setTime] = useState("");
  const [space, setSpace] = useState("");
  const [approach, setApproach] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [insight, setInsight] = useState(() => (insightVisible ? (state?.insight ?? "") : ""));
  const [nudged, setNudged] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const tagOptions = useMemo<ComboOption[]>(
    () =>
      Object.values(tags)
        .filter((t) => !t.archived)
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((t) => ({
          value: t.id,
          label: t.label,
          detail: CATEGORY_LABEL[t.category],
          keywords: t.description,
        })),
    [tags],
  );

  const alreadySolved = state?.attempts.some(
    (a) => a.result === "solved_alone" || a.result === "solved_with_hints",
  );
  const successful = result === "solved_alone" || result === "solved_with_hints";
  const wantInsight = successful && !alreadySolved && !state?.insight && insight.trim() === "";
  const locked = (r: AttemptResult): string | null => {
    if (session.sawSolution && (r === "solved_alone" || r === "solved_with_hints"))
      return "You saw the solution during this attempt.";
    if (session.hintsUsed > 0 && r === "solved_alone") return "You used hints during this attempt.";
    return null;
  };

  const minutesNumber = minutes.trim() === "" ? undefined : Number(minutes);
  const minutesInvalid =
    minutesNumber !== undefined &&
    (!Number.isFinite(minutesNumber) || minutesNumber < 0 || minutesNumber > 1440);

  const save = () => {
    if (!result || minutesInvalid) {
      setShowErrors(true);
      return;
    }
    if (wantInsight && !nudged) {
      setNudged(true);
      return;
    }
    try {
      const saved = saveAttempt({
        problemId: info.id,
        startedAt: session.startedAt ?? new Date(Date.now() - elapsedMs).toISOString(),
        minutes: minutesNumber === undefined ? undefined : Math.round(minutesNumber),
        language: session.language,
        code: session.code,
        result,
        hintsUsed: session.hintsUsed,
        approach,
        timeComplexity: time,
        spaceComplexity: space,
        mistakeTagIds: tagIds,
        mode,
        // During a re-solve the old insight stays unless a new one is written.
        insight: insightVisible || insight.trim() ? insight : undefined,
      });
      toast(saved.message, { tone: "success" });
      onSaved(saved);
      onClose();
    } catch {
      toast("Couldn't save the attempt. Your code is still here; try again.", { tone: "error" });
    }
  };

  return (
    <>
      <div className="space-y-5 px-4 py-4 sm:px-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text">How did it go?</legend>
          <div role="radiogroup" aria-label="Result" className="grid grid-cols-2 gap-2">
            {RESULT_ORDER.map((r) => {
              const Icon = RESULT_ICON[r];
              const reason = locked(r);
              const checked = result === r;
              return (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-disabled={reason ? true : undefined}
                  title={reason ?? undefined}
                  onClick={() => !reason && setResult(r)}
                  className={cx(
                    "flex min-h-18 flex-col items-start gap-1 rounded-panel border px-3 py-2.5 text-left transition-colors",
                    checked
                      ? "border-accent bg-accent-soft"
                      : "border-rule bg-surface hover:border-rule-strong hover:bg-surface-sunken",
                    reason && "cursor-not-allowed opacity-50 hover:border-rule hover:bg-surface",
                  )}
                >
                  <span className="flex items-center gap-2 font-medium text-text">
                    <Icon size={18} aria-hidden="true" className={RESULT_TONE[r]} />
                    {RESULT_LABEL[r]}
                  </span>
                  <span className="text-sm text-muted">{reason ?? RESULT_HELP[r]}</span>
                </button>
              );
            })}
          </div>
          {showErrors && !result && (
            <p className="mt-2 text-sm text-danger" role="alert">
              Choose how it went.
            </p>
          )}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field
            label="Minutes"
            hint={elapsedMs > 0 ? "From the timer." : undefined}
            error={showErrors && minutesInvalid ? "Enter minutes between 0 and 1440." : null}
          >
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </Field>
          <Field label="Time complexity">
            <Input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="O(n log n)"
            />
          </Field>
          <Field label="Space complexity">
            <Input value={space} onChange={(e) => setSpace(e.target.value)} placeholder="O(n)" />
          </Field>
        </div>

        <Field label="Approach" hint="Optional. Markdown works.">
          <Textarea rows={3} value={approach} onChange={(e) => setApproach(e.target.value)} />
        </Field>

        <MultiCombobox
          label="Mistakes"
          options={tagOptions}
          value={tagIds}
          onChange={setTagIds}
          placeholder="Search mistakes, such as off-by-one"
          onCreate={(label) => {
            const tag = addMistakeTag(label, "other");
            setTagIds((ids) => (ids.includes(tag.id) ? ids : [...ids, tag.id]));
          }}
          createLabel={(text) => `Add a new mistake “${text}”`}
        />

        <Field
          label="Insight"
          hint={
            insightVisible
              ? "The one thing to remember about this problem."
              : "Your saved insight stays hidden and is kept unless you write a new one."
          }
        >
          <Input
            value={insight}
            onChange={(e) => {
              setInsight(e.target.value);
              setNudged(false);
            }}
            placeholder="For example: store what you've seen in a hash map"
            aria-invalid={nudged && wantInsight ? true : undefined}
          />
        </Field>
        {nudged && wantInsight && (
          <p
            role="alert"
            className="-mt-2 rounded-control bg-warning-soft px-3 py-2 text-base text-text"
          >
            This is your first solve. One line now saves rereading the whole problem before an
            interview.
          </p>
        )}
      </div>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-surface-raised px-4 py-3 sm:px-5">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={save}>
          {nudged && wantInsight ? "Save without insight" : "Save attempt"}
        </Button>
      </div>
    </>
  );
}
