// Path to a concept (F25): every unmet prerequisite in an order you can learn them, with status
// and minutes, the total time, and the path highlighted on the map. "Add to plan" puts the next
// one or two into today's plan; "Set as focus" adds the subject to this week's focus.
import { CalendarPlus, ChevronDown, Crosshair, Flag, X } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { STATUS_LABEL } from "@/components/ui/labels";
import { subjectById } from "@/data/syllabus";
import type { ConceptPath } from "@/lib/path/path";
import { addPlanItems, removePlanItem, usePlanStore } from "@/stores/planStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { formatMinutes, localDate } from "@/lib/time";

interface PathPanelProps {
  path: ConceptPath;
  onPick: (conceptId: string) => void;
  onClose: () => void;
  mobile: boolean;
}

export function PathPanel({ path, onPick, onClose, mobile }: PathPanelProps) {
  const [open, setOpen] = useState(!mobile);
  const profile = useProfileStore((s) => s.profile);
  const update = useProfileStore((s) => s.update);
  const target = path.steps.at(-1)!.concept;
  const subject = subjectById.get(target.subjectId);
  const focused = profile?.focusSubjects.includes(target.subjectId) ?? false;

  const addToPlan = () => {
    const next = path.steps
      .filter((s) => s.status === "not_started" || s.status === "fading")
      .slice(0, 2);
    if (next.length === 0) {
      toast("Everything on this path is already under way.");
      return;
    }
    const today = localDate();
    const added = addPlanItems(
      next.map((s) => ({
        kind: s.status === "fading" ? ("review-concept" as const) : ("learn-concept" as const),
        refId: s.concept.id,
        refIds: s.status === "fading" ? [s.concept.id] : undefined,
        title: `${s.status === "fading" ? "Review" : "Learn"}: ${s.concept.name}`,
        reason: s.target ? "The concept you're working toward." : `On your path to ${target.name}.`,
        estMinutes: s.status === "fading" ? 8 : s.minutes,
      })),
      { budget: profile?.dailyMinutes },
    );
    if (added === 0) {
      toast("Those are already on today's plan.");
      return;
    }
    const ids = next.map((s) => s.concept.id);
    toast(`${added === 1 ? "1 step" : `${added} steps`} added to today's plan.`, {
      action: {
        label: "Undo",
        onClick: () => {
          const plan = usePlanStore.getState().plans[today];
          for (const item of plan?.items.filter((i) => i.refId && ids.includes(i.refId)) ?? []) {
            removePlanItem(today, item.id);
          }
        },
      },
    });
  };

  const setFocus = () => {
    if (!profile || focused) return;
    const before = profile.focusSubjects;
    update({ focusSubjects: [...before, target.subjectId] });
    toast(`${subject?.name} is a focus subject this week.`, {
      action: { label: "Undo", onClick: () => update({ focusSubjects: before }) },
    });
  };

  return (
    <section
      aria-labelledby="path-heading"
      className={cx(
        "map-path flex flex-col overflow-hidden rounded-panel border border-rule bg-surface shadow-float",
        mobile ? "max-h-[55%]" : "max-h-[calc(100%-24px)] w-[340px]",
      )}
    >
      <div className="flex items-start gap-2 border-b border-rule px-3 py-2.5">
        <Crosshair size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <h2 id="path-heading" className="text-base font-semibold text-text">
            Your path to {target.name}
          </h2>
          <p className="text-sm text-muted">
            {path.before === 0
              ? "Nothing stands in the way. You can learn it now."
              : `${path.before} ${path.before === 1 ? "concept" : "concepts"} first, about ${formatMinutes(path.totalMinutes)} in all.`}
          </p>
        </div>
        {mobile && (
          <IconButton
            icon={ChevronDown}
            label={open ? "Hide the steps" : "Show the steps"}
            size="sm"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={cx("transition-transform", !open && "rotate-180")}
          />
        )}
        <IconButton icon={X} label="Close the path" size="sm" onClick={onClose} />
      </div>
      {open && (
        <>
          <ol className="min-h-0 flex-1 overflow-y-auto py-1">
            {path.steps.map((s, i) => (
              <li key={s.concept.id}>
                <button
                  type="button"
                  onClick={() => onPick(s.concept.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-surface-sunken"
                >
                  <span className="w-5 shrink-0 text-right text-xs text-faint tabular-nums">
                    {s.target ? (
                      <Flag size={13} aria-hidden="true" className="ml-auto text-accent" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <StatusGlyph status={s.status} size={14} title={STATUS_LABEL[s.status]} />
                  <span
                    className={cx(
                      "min-w-0 flex-1 truncate text-base",
                      s.target ? "font-semibold text-text" : "text-text",
                    )}
                  >
                    {s.concept.name}
                  </span>
                  <span className="shrink-0 text-sm text-muted tabular-nums">{s.minutes} min</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2 border-t border-rule px-3 py-2.5">
            <Button size="sm" variant="primary" icon={CalendarPlus} onClick={addToPlan}>
              Add to plan
            </Button>
            <Button size="sm" disabled={focused} onClick={setFocus}>
              {focused ? `${subject?.shortName} is a focus` : "Set as focus"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
