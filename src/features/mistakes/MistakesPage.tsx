// Mistakes (F8): the most common mistakes over 30 days, 90 days or all time with a trend per
// tag, a pre-interview checklist of the top five with how to avoid each, breakdowns by category
// and by pattern, every attempt behind a tag (one click from its code), and tag management.
import { ArrowLeft, Minus, NotebookPen, Settings2, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { conceptHref, navigate, routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { CODE_LANGUAGE_LABEL, normalizeLanguage } from "@/components/ui/code/languages";
import { cx } from "@/components/ui/cx";
import { EmptyState, PageSkeleton } from "@/components/ui/Misc";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { conceptById } from "@/data/syllabus";
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  categoryCounts,
  checklistTags,
  tagCounts,
  taggedAttempts,
  topPatternFor,
  type MistakeWindow,
  type TagCount,
  type TaggedAttempt,
} from "@/lib/mistakes/stats";
import { problemInfo, problemLabel } from "@/lib/problems/catalog";
import { relativeDate } from "@/lib/problems/progress";
import type { MistakeTag } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { updateMistakeTag, useMistakeTagStore } from "@/stores/mistakeTagStore";
import { useProblemStore } from "@/stores/problemStore";
import { AutoField } from "../problems/workspace/fields";
import { LaterClaudeButton, ResultLabel } from "../problems/parts";
import { ManageTagsDialog } from "./ManageTagsDialog";

const WINDOW_OPTIONS: { value: string; label: string }[] = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "all", label: "All time" },
];

function parseWindow(v: string | null): MistakeWindow {
  return v === "30" ? 30 : v === "all" ? "all" : 90;
}

function Trend({ c, window }: { c: TagCount; window: MistakeWindow }) {
  const span = window === "all" ? 30 : window;
  const text =
    c.trend === "up"
      ? `More often than the ${span} days before (${c.previous})`
      : c.trend === "down"
        ? `Less often than the ${span} days before (${c.previous})`
        : `About the same as the ${span} days before`;
  const Icon = c.trend === "up" ? TrendingUp : c.trend === "down" ? TrendingDown : Minus;
  return (
    <span
      title={text}
      className={cx(
        "inline-flex w-6 shrink-0 justify-center",
        c.trend === "up" && "text-warning",
        c.trend === "down" && "text-success",
        c.trend === "flat" && "text-faint",
      )}
    >
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only">{text}</span>
    </span>
  );
}

function Panel({
  title,
  description,
  children,
  id,
  action,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  id: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cx("rounded-panel border border-rule bg-surface", className)}
    >
      <div className="flex items-start justify-between gap-3 border-b border-rule px-4 py-3">
        <div>
          <h2 id={id} className="text-md font-semibold text-text">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function BarList({
  counts,
  window,
  onPick,
}: {
  counts: TagCount[];
  window: MistakeWindow;
  onPick: (id: string) => void;
}) {
  const max = Math.max(1, ...counts.map((c) => c.count));
  return (
    <ul className="space-y-1">
      {counts.map((c) => (
        <li key={c.tag.id}>
          <button
            type="button"
            onClick={() => onPick(c.tag.id)}
            className="flex w-full items-center gap-3 rounded-control px-1 py-1 text-left hover:bg-surface-sunken max-md:py-2"
          >
            <span className="w-36 shrink-0 truncate text-base text-text sm:w-48">
              {c.tag.label}
            </span>
            <span className="relative h-3 min-w-0 flex-1" aria-hidden="true">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px]"
                style={{ width: `${(c.count / max) * 100}%`, background: "var(--chart-series)" }}
              />
            </span>
            <span className="w-8 shrink-0 text-right text-sm font-medium text-text tabular-nums">
              {c.count}
              <span className="sr-only"> {c.count === 1 ? "time" : "times"}</span>
            </span>
            <Trend c={c} window={window} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Checklist({ items }: { items: TagCount[] }) {
  if (items.length === 0) {
    return (
      <p className="text-base text-muted">
        Your five most common mistakes appear here with how to avoid each one, ready to read before
        an interview.
      </p>
    );
  }
  return (
    <ol className="space-y-4">
      {items.map((c, i) => (
        <li key={c.tag.id} className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent tabular-nums">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="font-medium text-text">
              {c.tag.label}{" "}
              <span className="text-sm font-normal text-muted">
                {c.count} {c.count === 1 ? "time" : "times"}
              </span>
            </p>
            <AutoField
              label={`How to avoid ${c.tag.label}`}
              hideLabel
              value={c.tag.howToAvoid ?? ""}
              onSave={(v) => updateMistakeTag(c.tag.id, { howToAvoid: v })}
              placeholder="One line: what you'll do differently"
              multiline
              rows={2}
              inputClassName="min-h-0 text-base"
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function TagDetail({
  tag,
  items,
  today,
}: {
  tag: MistakeTag | undefined;
  items: TaggedAttempt[];
  today: string;
}) {
  const states = useProblemStore((s) => s.states);
  const back = (
    <Button href="#/mistakes" icon={ArrowLeft} variant="ghost" size="sm">
      All mistakes
    </Button>
  );
  if (!tag) {
    return (
      <EmptyState icon={NotebookPen} title="This mistake tag doesn't exist anymore" actions={back}>
        It may have been merged into another tag.
      </EmptyState>
    );
  }
  const list = items.filter((i) => i.tagId === tag.id);
  return (
    <div className="space-y-5">
      {back}
      <div className="rounded-panel border border-rule bg-surface px-4 py-4 sm:px-5">
        <p className="text-sm text-muted">
          Category: <span className="text-text">{CATEGORY_LABEL[tag.category]}</span>
        </p>
        {tag.description && <p className="mt-1 text-base text-muted">{tag.description}</p>}
        <div className="mt-4 max-w-2xl">
          <AutoField
            label="How to avoid it"
            value={tag.howToAvoid ?? ""}
            onSave={(v) => updateMistakeTag(tag.id, { howToAvoid: v })}
            placeholder="One line: what you'll do differently"
          />
        </div>
      </div>
      <section
        aria-labelledby="tag-attempts"
        className="rounded-panel border border-rule bg-surface"
      >
        <h3
          id="tag-attempts"
          className="border-b border-rule px-4 py-3 text-md font-semibold text-text"
        >
          {list.length} {list.length === 1 ? "attempt" : "attempts"} with this mistake
        </h3>
        {list.length === 0 ? (
          <p className="px-4 py-3 text-base text-muted">No attempts carry this tag yet.</p>
        ) : (
          <ul>
            {list.map((it) => {
              const info = problemInfo(it.problemId, states[it.problemId]);
              return (
                <li
                  key={`${it.attemptId}-${it.tagId}`}
                  className="flex flex-col gap-1 border-t border-rule px-4 py-2.5 first:border-t-0 sm:flex-row sm:items-center sm:gap-4"
                >
                  <a
                    href={routeHref("/problems", it.problemId, { attempt: it.attemptId })}
                    className="min-w-0 flex-1 font-medium text-text hover:text-accent hover:underline"
                  >
                    {info ? problemLabel(info) : it.problemId}
                  </a>
                  <span className="flex items-center gap-4 text-sm text-muted">
                    <ResultLabel result={it.result} short />
                    <span>{CODE_LANGUAGE_LABEL[normalizeLanguage(it.language)]}</span>
                    <span className="w-20 text-right">{relativeDate(it.date, today)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function MistakesPage() {
  const route = useRoute();
  const problemsLoaded = useProblemStore((s) => s.loaded);
  const tagsLoaded = useMistakeTagStore((s) => s.loaded);
  const loaded = problemsLoaded && tagsLoaded;
  const states = useProblemStore((s) => s.states);
  const tagMap = useMistakeTagStore((s) => s.tags);
  const today = useToday();
  const [manageOpen, setManageOpen] = useState(false);
  const win = parseWindow(route.query.get("window"));
  const tagParam = route.query.get("tag");

  const tags = useMemo(() => Object.values(tagMap), [tagMap]);
  const items = useMemo(() => taggedAttempts(states), [states]);
  const counts = useMemo(() => tagCounts(items, tags, win, today), [items, tags, win, today]);
  const checklist = useMemo(() => checklistTags(items, tags, today), [items, tags, today]);
  const byCategory = useMemo(() => categoryCounts(counts), [counts]);
  const patterns = useMemo(
    () =>
      counts
        .slice(0, 6)
        .map((c) => ({ c, top: topPatternFor(items, c.tag.id, win, today) }))
        .filter((x) => x.top && x.top.count >= 1),
    [counts, items, win, today],
  );

  const setWindow = (w: string) =>
    navigate(routeHref("/mistakes", undefined, w === "90" ? {} : { window: w }), { replace: true });
  const pick = (id: string) => navigate(routeHref("/mistakes", undefined, { tag: id }));

  const manage = (
    <Button icon={Settings2} onClick={() => setManageOpen(true)}>
      Manage tags
    </Button>
  );

  return (
    <PageFrame>
      <PageHeader
        title={tagParam ? (tagMap[tagParam]?.label ?? "Mistakes") : "Mistakes"}
        documentTitle="Mistakes"
        description={tagParam ? undefined : "Stop repeating the same small mistakes."}
        actions={manage}
      />
      {!loaded ? (
        <PageSkeleton />
      ) : tagParam ? (
        <TagDetail tag={tagMap[tagParam]} items={items} today={today} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No mistakes logged yet"
          actions={<Button href="#/problems">Go to problems</Button>}
        >
          When you save an attempt, tag what went wrong, such as an off-by-one or a missed empty
          input. Your most common mistakes then show up here with a checklist to read before an
          interview.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <SegmentedControl
            label="Time window"
            value={String(win)}
            onChange={setWindow}
            options={WINDOW_OPTIONS}
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <Panel
              id="top-mistakes"
              title="Top mistakes"
              description="Click one to see every attempt that had it. Arrows compare with the period before."
            >
              {counts.length === 0 ? (
                <p className="text-base text-muted">No mistakes tagged in this period.</p>
              ) : (
                <BarList counts={counts.slice(0, 12)} window={win} onPick={pick} />
              )}
            </Panel>
            <Panel
              id="checklist"
              title="My pre-interview checklist"
              description="Your five most common mistakes in the last 90 days."
              action={
                <LaterClaudeButton
                  size="sm"
                  variant="ghost"
                  label="Suggest with Claude"
                  title="Suggest with Claude"
                >
                  <p>
                    Claude will read the attempts behind each mistake and draft a one-line “how to
                    avoid it” for you to edit.
                  </p>
                </LaterClaudeButton>
              }
            >
              <Checklist items={checklist} />
            </Panel>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel id="by-category" title="By category">
              <ul className="space-y-1.5">
                {CATEGORY_ORDER.filter((c) => byCategory.get(c)).map((c) => {
                  const n = byCategory.get(c)!;
                  const max = Math.max(...byCategory.values());
                  return (
                    <li key={c} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 text-base text-text">{CATEGORY_LABEL[c]}</span>
                      <span className="relative h-3 flex-1" aria-hidden="true">
                        <span
                          className="absolute inset-y-0 left-0 rounded-r-[4px]"
                          style={{ width: `${(n / max) * 100}%`, background: "var(--chart-2)" }}
                        />
                      </span>
                      <span className="w-8 text-right text-sm font-medium text-text tabular-nums">
                        {n}
                      </span>
                    </li>
                  );
                })}
                {byCategory.size === 0 && (
                  <li className="text-base text-muted">No mistakes tagged in this period.</li>
                )}
              </ul>
            </Panel>
            <Panel id="by-pattern" title="Where they happen">
              {patterns.length === 0 ? (
                <p className="text-base text-muted">
                  Mistakes on problems linked to patterns show where each one happens most.
                </p>
              ) : (
                <ul className="space-y-2 text-base">
                  {patterns.map(({ c, top }) => {
                    const concept = conceptById.get(top!.conceptId);
                    return (
                      <li key={c.tag.id} className="text-text">
                        <button
                          type="button"
                          onClick={() => pick(c.tag.id)}
                          className="font-medium hover:underline"
                        >
                          {c.tag.label}
                        </button>{" "}
                        shows up most in{" "}
                        <a
                          href={conceptHref(top!.conceptId)}
                          className="text-accent hover:underline"
                        >
                          {concept?.name ?? top!.conceptId}
                        </a>{" "}
                        <span className="text-muted">
                          ({top!.count} of {top!.total})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
      <ManageTagsDialog open={manageOpen} onClose={() => setManageOpen(false)} />
    </PageFrame>
  );
}
