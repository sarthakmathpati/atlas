// The workspace's problem side (F7 left pane): title and link, patterns, star and tags, the
// insight, your summary, notes, when it comes back, the attempts timeline and the mistakes made
// on it. In re-solve mode the attempts, insight, notes, patterns and mistakes stay hidden until
// the owner reveals them (which marks the attempt as "saw the solution").
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  Link2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { conceptHref, navigate, routeHref } from "@/app/router";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip, DifficultyChip, PatternChip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input, Switch } from "@/components/ui/Field";
import { Callout, Skeleton } from "@/components/ui/Misc";
import { Menu, type MenuItem } from "@/components/ui/Popover";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { subjectById, topicById } from "@/data/syllabus";
import { problemLabel, problemUrl, type ProblemInfo } from "@/lib/problems/catalog";
import { mistakeCounts, reviewInfo, weekdayDate } from "@/lib/problems/progress";
import { isTricky } from "@/lib/srs/problem";
import type { ProblemState } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { useMistakeTagStore } from "@/stores/mistakeTagStore";
import { deleteCustomProblem, restoreProblem, updateProblem } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { StarToggle } from "../parts";
import { conceptName } from "../problemUi";
import { AttemptsTimeline } from "./AttemptsTimeline";
import { EditProblemDialog } from "./EditProblemDialog";
import { AutoField, TagEditor } from "./fields";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));

function Section({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("space-y-2", className)} aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-md font-semibold text-text">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Hidden({ what, onReveal }: { what: string; onReveal: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-dashed border-rule-strong px-3 py-2.5 text-base text-muted">
      <span className="flex items-center gap-2">
        <EyeOff size={16} aria-hidden="true" />
        {what} hidden during the re-solve.
      </span>
      <Button size="sm" variant="ghost" onClick={onReveal}>
        Reveal
      </Button>
    </div>
  );
}

function Notes({ state, id }: { state: ProblemState | undefined; id: string }) {
  const notes = state?.myNotes ?? "";
  const [view, setView] = useState<"write" | "preview">(notes ? "preview" : "write");
  return (
    <div className="space-y-2">
      <SegmentedControl<"write" | "preview">
        label="Notes view"
        size="sm"
        value={view}
        onChange={setView}
        options={[
          { value: "write", label: "Write" },
          { value: "preview", label: "Preview" },
        ]}
      />
      {view === "write" ? (
        <AutoField
          label="My notes"
          hideLabel
          multiline
          rows={6}
          value={notes}
          onSave={(v) => updateProblem(id, { myNotes: v })}
          placeholder="Approach ideas, constraints, what tripped you up. Markdown works."
          inputClassName="font-mono text-sm"
        />
      ) : notes.trim() ? (
        <div className="rounded-control border border-rule bg-surface px-3 py-2.5">
          <Suspense fallback={<Skeleton className="h-16 w-full" />}>
            <MarkdownView compact>{notes}</MarkdownView>
          </Suspense>
        </div>
      ) : (
        <p className="text-base text-muted">No notes yet.</p>
      )}
    </div>
  );
}

function ReviewSection({ info, state }: { info: ProblemInfo; state: ProblemState }) {
  const today = useToday();
  const intensity = useProfileStore((s) => s.profile?.reviewIntensity ?? "normal");
  const review = reviewInfo(state, info.difficulty, intensity, today);
  let line: string;
  switch (review.kind) {
    case "mastered":
      line =
        "Mastered: solved on your own three times at long intervals. It only comes back in revision sheets.";
      break;
    case "due":
      line =
        review.daysLate <= 0
          ? "Due for a re-solve today."
          : `Due for a re-solve, ${review.daysLate} ${review.daysLate === 1 ? "day" : "days"} late.`;
      break;
    case "upcoming":
      line = `Comes back ${review.inDays === 1 ? "tomorrow" : `in ${review.inDays} days`}, on ${weekdayDate(review.dueAt, today)}.`;
      break;
    case "off":
      line = "Out of review: it won't come back unless you bring it back.";
      break;
    default:
      line = "Not scheduled yet.";
  }
  return (
    <Section title="Review">
      <p className="text-base text-text">{line}</p>
      {isTricky(state.srs) && (
        <p className="text-sm text-warning">
          Tricky: it slipped {state.srs.lapses} times, so it comes back more often.
        </p>
      )}
      {review.kind === "due" && (
        <Button
          size="sm"
          icon={RotateCcw}
          href={routeHref("/problems", info.id, { mode: "resolve" })}
        >
          Re-solve now
        </Button>
      )}
      {!state.srs.retired && (
        <Switch
          label="Bring it back for review"
          description="Re-solving just before you'd forget is what makes it stick."
          checked={state.inReview}
          onChange={(inReview) => {
            updateProblem(info.id, { inReview });
            toast(inReview ? "It will come back for review." : "It won't come back for review.");
          }}
        />
      )}
    </Section>
  );
}

function MistakesHere({ state }: { state: ProblemState | undefined }) {
  const tags = useMistakeTagStore((s) => s.tags);
  const counts = [...mistakeCounts(state).entries()].sort((a, b) => b[1] - a[1]);
  if (counts.length === 0)
    return <p className="text-base text-muted">No mistakes tagged on this problem.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {counts.map(([id, n]) => (
        <a
          key={id}
          href={routeHref("/mistakes", undefined, { tag: id })}
          className="inline-flex h-6 items-center gap-1.5 rounded-full border border-rule bg-surface-sunken px-2 text-xs font-medium text-text hover:border-rule-strong max-md:h-9"
        >
          {tags[id]?.label ?? id}
          {n > 1 && <span className="text-muted tabular-nums">×{n}</span>}
        </a>
      ))}
    </div>
  );
}

function LinkDialog({
  open,
  onClose,
  info,
  state,
}: {
  open: boolean;
  onClose: () => void;
  info: ProblemInfo;
  state: ProblemState | undefined;
}) {
  const [value, setValue] = useState(problemUrl(info, state) ?? "");
  const [was, setWas] = useState(open);
  if (was !== open) {
    setWas(open);
    if (open) setValue(problemUrl(info, state) ?? "");
  }
  const original = problemUrl(info);
  const save = () => {
    const v = value.trim();
    updateProblem(info.id, { urlOverride: v && v !== original ? v : undefined });
    onClose();
    toast("Link saved.");
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit the link"
      description="If the link is wrong or has moved, paste the right one."
      size="sm"
      footer={
        <>
          {state?.urlOverride && (
            <Button
              variant="ghost"
              className="mr-auto"
              onClick={() => {
                updateProblem(info.id, { urlOverride: undefined });
                onClose();
                toast("Back to the original link.");
              }}
            >
              Use the original
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Save link
          </Button>
        </>
      }
    >
      <div className="px-4 py-4 sm:px-5">
        <Field label="Link">
          <Input
            data-autofocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="url"
          />
        </Field>
      </div>
    </Dialog>
  );
}

interface InfoPaneProps {
  info: ProblemInfo;
  state: ProblemState | undefined;
  mode: "normal" | "resolve";
  revealed: boolean;
  onReveal: () => void;
  onOpenAttempt: (id: string) => void;
  /** The page title is rendered above the tabs (narrow screens). */
  titleOutside?: boolean;
}

/** The problem's name as the page heading, with its topic above it. */
export function ProblemTitle({ info, className }: { info: ProblemInfo; className?: string }) {
  const topic = info.topicId ? topicById.get(info.topicId) : undefined;
  const eyebrow =
    info.source === "quant"
      ? "Quant puzzle"
      : info.custom
        ? topic
          ? `Your problem, ${topic.name}`
          : "Your problem"
        : topic
          ? `${subjectById.get(topic.subjectId)?.shortName ?? ""}: ${topic.name}`
          : undefined;
  return (
    <PageHeader
      documentTitle={info.title}
      eyebrow={eyebrow}
      title={problemLabel(info)}
      className={cx("mb-3 sm:mb-3", className)}
    />
  );
}

export function InfoPane({
  info,
  state,
  mode,
  revealed,
  onReveal,
  onOpenAttempt,
  titleOutside,
}: InfoPaneProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const hidden = mode === "resolve" && !revealed;
  const url = problemUrl(info, state);
  const menuItems: MenuItem[] = [];
  if (info.custom) {
    menuItems.push({
      id: "edit",
      label: "Edit details",
      icon: Pencil,
      onSelect: () => setEditOpen(true),
    });
  } else {
    menuItems.push({
      id: "link",
      label: "Edit the link",
      icon: Link2,
      onSelect: () => setLinkOpen(true),
    });
  }
  if (info.custom) {
    menuItems.push({
      id: "delete",
      label: "Delete problem",
      icon: Trash2,
      danger: true,
      onSelect: () => {
        const removed = deleteCustomProblem(info.id);
        navigate("/problems");
        toast("Problem deleted.", {
          action: removed
            ? { label: "Undo", onClick: () => restoreProblem(removed, info.id) }
            : undefined,
        });
      },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        {!titleOutside && <ProblemTitle info={info} />}
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyChip difficulty={info.difficulty} />
          {info.premium && <Chip>Premium</Chip>}
          {info.language === "sql" && <Chip>SQL</Chip>}
          {hidden
            ? info.conceptIds.length > 0 && <Chip className="border-dashed">Patterns hidden</Chip>
            : info.conceptIds.map((id) => (
                <PatternChip key={id} label={conceptName(id)} href={conceptHref(id)} />
              ))}
          {info.needsReview && (
            <Chip
              className="border-dashed text-warning"
              title="Some details haven't been double-checked yet"
            >
              Unverified
            </Chip>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {url && (
            <Button size="sm" href={url} trailingIcon={ArrowUpRight}>
              {/leetcode\./.test(url) ? "Open on LeetCode" : "Open link"}
            </Button>
          )}
          <StarToggle
            starred={state?.starred ?? false}
            onToggle={() => updateProblem(info.id, { starred: !state?.starred })}
            label={info.title}
          />
          <Menu
            label="More actions"
            items={menuItems}
            renderTrigger={(props) => (
              <IconButton {...props} icon={MoreHorizontal} label="More actions" size="sm" />
            )}
          />
        </div>
      </div>

      {mode === "resolve" && (
        <Callout
          tone="info"
          icon={RotateCcw}
          title="Re-solve from scratch"
          actions={
            !revealed && (
              <Button size="sm" icon={Eye} onClick={onReveal}>
                Reveal
              </Button>
            )
          }
        >
          {revealed
            ? "You revealed your earlier work, so this attempt counts as “saw the solution”."
            : "Your earlier code, insight and notes are hidden until you save this attempt."}
        </Callout>
      )}

      {info.prompt && info.source === "quant" && (
        <Section title="The puzzle">
          <p className="max-w-[70ch] text-md text-text">{info.prompt}</p>
          <p className="text-sm text-muted">
            Work it out in the editor, then save your attempt. Answer checking arrives with quant
            practice in phase 8.
          </p>
        </Section>
      )}

      <Section title="Insight">
        {hidden ? (
          <Hidden what="Your insight is" onReveal={onReveal} />
        ) : (
          <AutoField
            label="Insight"
            hideLabel
            value={state?.insight ?? ""}
            onSave={(v) => updateProblem(info.id, { insight: v })}
            placeholder="The one thing to remember about this problem"
            inputClassName="h-11 text-md font-medium placeholder:font-normal"
          />
        )}
      </Section>

      <Section title="Your summary">
        <AutoField
          label="Your summary"
          hideLabel
          multiline
          rows={2}
          value={state?.summary ?? ""}
          onSave={(v) => updateProblem(info.id, { summary: v })}
          placeholder="The problem in your own words, so you don't need to open it every time."
        />
      </Section>

      <details className="group" open={Boolean(state?.myNotes) && !hidden}>
        <summary className="flex cursor-pointer list-none items-center gap-2 text-md font-semibold text-text marker:hidden">
          <span
            className="inline-block transition-transform group-open:rotate-90"
            aria-hidden="true"
          >
            ›
          </span>
          My notes
        </summary>
        <div className="mt-2">
          {hidden ? (
            <Hidden what="Your notes are" onReveal={onReveal} />
          ) : (
            <Notes state={state} id={info.id} />
          )}
        </div>
      </details>

      <TagEditor tags={state?.tags ?? []} onChange={(tags) => updateProblem(info.id, { tags })} />

      {state && state.attempts.length > 0 && !hidden && <ReviewSection info={info} state={state} />}

      <Section title={`Attempts${state?.attempts.length ? ` (${state.attempts.length})` : ""}`}>
        {hidden ? (
          <Hidden what="Your earlier attempts are" onReveal={onReveal} />
        ) : (
          <AttemptsTimeline state={state} onOpen={onOpenAttempt} />
        )}
      </Section>

      {!hidden && state && state.attempts.length > 0 && (
        <Section title="Mistakes on this problem">
          <MistakesHere state={state} />
        </Section>
      )}

      <LinkDialog open={linkOpen} onClose={() => setLinkOpen(false)} info={info} state={state} />
      {info.custom && state?.custom && (
        <EditProblemDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          id={info.id}
          custom={state.custom}
        />
      )}
    </div>
  );
}
