// A design prompt (F26): the prompt, what a strong answer covers (hidden until asked, like an
// interview), the workspace for the attempt in progress, and earlier attempts with their reviews
// and sketches. Finishing an attempt counts as practice for the linked classic concept.
import { DraftingCompass, Eye, History, Play, Trash2 } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { conceptHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { DifficultyChip, PatternChip } from "@/components/ui/Chip";
import { EmptyState, PageSkeleton, Skeleton } from "@/components/ui/Misc";
import { seedProblemById } from "@/data/seed";
import { conceptById } from "@/data/syllabus";
import {
  attemptScore,
  designKind,
  readReview,
  sectionsFor,
  summarizeDesign,
} from "@/lib/designs/designs";
import { parseSketch } from "@/lib/designs/sketch";
import { relativeDate } from "@/lib/problems/progress";
import { localDate } from "@/lib/time";
import type { DesignAttempt, SeedProblem } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import {
  attemptsForProblem,
  deleteDesignAttempt,
  finishDesign,
  restoreDesignAttempt,
  startDesign,
  useDesignStore,
} from "@/stores/designStore";
import { toast } from "@/stores/toastStore";
import { NotFoundPage } from "../placeholder/pages";
import { ReviewView, SelfReviewView } from "./DesignReviewPanel";
import { DesignWorkspace } from "./DesignWorkspace";

const SketchView = lazy(() => import("./SketchView"));

function PastAttempt({ problem, attempt }: { problem: SeedProblem; attempt: DesignAttempt }) {
  const today = useToday();
  const kind = designKind(problem);
  const review = readReview(attempt.review);
  const score = attemptScore(attempt);
  const sketch = useMemo(
    () => parseSketch(attempt.sections.sketch ?? ""),
    [attempt.sections.sketch],
  );
  return (
    <details className="rounded-panel border border-rule bg-surface">
      <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-base text-text">
        <span className="font-medium">
          {relativeDate(localDate(new Date(attempt.finishedAt!)), today)}
          {attempt.mode === "mock" ? ", in a mock interview" : ""}
        </span>
        <span className="text-sm text-muted">
          {score ? `${score.score}/5 (${score.by === "claude" ? "Claude" : "your review"})` : ""}
          {attempt.elapsedMs ? `, ${Math.round(attempt.elapsedMs / 60_000)} min` : ""}
        </span>
      </summary>
      <div className="space-y-5 border-t border-rule px-4 py-4">
        {sectionsFor(kind).map((s) => {
          const v = attempt.sections[s.key]?.trim();
          if (!v || s.editor === "sketch") return null;
          return (
            <div key={s.key}>
              <p className="text-sm font-medium text-muted">{s.label}</p>
              <p
                className={
                  s.editor === "code"
                    ? "mt-1 overflow-x-auto rounded-control bg-code p-3 font-mono text-sm whitespace-pre text-text"
                    : "mt-1 max-w-[70ch] text-base whitespace-pre-wrap text-text"
                }
              >
                {v}
              </p>
            </div>
          );
        })}
        {sketch.nodes.length > 0 && (
          <Suspense fallback={<Skeleton className="h-72 w-full" />}>
            <SketchView sketch={sketch} direction="LR" height={300} />
          </Suspense>
        )}
        {review ? (
          <ReviewView review={review} />
        ) : attempt.selfReview && problem.rubric ? (
          <SelfReviewView rubric={problem.rubric} points={attempt.selfReview} />
        ) : null}
      </div>
    </details>
  );
}

export default function DesignPage() {
  const route = useRoute();
  const problem = route.id ? seedProblemById.get(route.id) : undefined;
  const loaded = useDesignStore((s) => s.loaded);
  const all = useDesignStore((s) => s.attempts);
  const [showRubric, setShowRubric] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const attempts = useMemo(
    () => (problem ? attemptsForProblem(all, problem.id) : []),
    [all, problem],
  );
  const summary = summarizeDesign(attempts.filter((a) => a.mode !== "mock"));

  if (!problem || (problem.source !== "design-lld" && problem.source !== "design-hld")) {
    return <NotFoundPage />;
  }
  const lld = problem.source === "design-lld";
  const open = summary.open;
  const finished = attempts.filter((a) => a.finishedAt).reverse();

  const start = () => {
    const a = startDesign(problem.id);
    setFresh(a.id);
  };

  const discard = () => {
    if (!open) return;
    const removed = deleteDesignAttempt(open.id);
    toast("Design attempt discarded.", {
      action: removed ? { label: "Undo", onClick: () => restoreDesignAttempt(removed) } : undefined,
    });
  };

  const save = () => {
    if (!open) return;
    const saved = finishDesign(open.id);
    if (!saved) return;
    const concept = conceptById.get(problem.conceptIds[0] ?? "");
    toast(concept ? `Design saved. It counts as practice for ${concept.name}.` : "Design saved.", {
      tone: "success",
    });
  };

  return (
    <PageFrame>
      <PageHeader eyebrow={lld ? "Low-level design" : "System design"} title={problem.title} />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <DifficultyChip difficulty={problem.difficulty} />
        {problem.conceptIds.map((id) => {
          const c = conceptById.get(id);
          return c ? <PatternChip key={id} label={c.name} href={conceptHref(id)} /> : null;
        })}
        {summary.finished > 0 && (
          <span className="text-sm text-muted">
            Done {summary.finished}×{summary.lastScore ? `, last ${summary.lastScore}/5` : ""}
          </span>
        )}
      </div>
      {!loaded ? (
        <PageSkeleton />
      ) : (
        <div className="max-w-4xl space-y-6">
          <section
            aria-labelledby="prompt-heading"
            className="rounded-panel border border-rule bg-surface p-4 sm:p-5"
          >
            <h2 id="prompt-heading" className="text-md font-semibold text-text">
              The prompt
            </h2>
            <p className="mt-2 max-w-[70ch] text-md text-text">{problem.prompt}</p>
            {problem.rubric && (
              <div className="mt-3">
                {showRubric ? (
                  <>
                    <p className="text-sm font-medium text-muted">What a strong answer covers</p>
                    <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-base text-text marker:text-muted">
                      {problem.rubric.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" icon={Eye} onClick={() => setShowRubric(true)}>
                    Show what a strong answer covers
                  </Button>
                )}
              </div>
            )}
          </section>

          {open ? (
            <section aria-label="Your design" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-md font-semibold text-text">Your design</h2>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={discard}>
                  Discard this attempt
                </Button>
              </div>
              <DesignWorkspace
                key={open.id}
                problem={problem}
                attempt={open}
                onSaved={save}
                autoStart={fresh === open.id}
              />
            </section>
          ) : (
            <EmptyState
              icon={DraftingCompass}
              title={finished.length ? "Practice it again" : "Design it in 45 minutes"}
              actions={
                <Button variant="primary" icon={Play} onClick={start}>
                  {finished.length ? "Start a new attempt" : "Start the design"}
                </Button>
              }
            >
              {lld
                ? "Write the requirements, classes, relationships, key methods, patterns, concurrency and code, with a class sketch, then review it against the must-discuss points."
                : "Write the requirements, estimates, API, data model and architecture, with a sketch, then the deep dives and trade-offs, and review it against the must-discuss points."}
            </EmptyState>
          )}

          {finished.length > 0 && (
            <section aria-labelledby="past-heading" className="space-y-2">
              <h2
                id="past-heading"
                className="flex items-center gap-2 text-md font-semibold text-text"
              >
                <History size={16} aria-hidden="true" className="text-muted" />
                Earlier attempts
              </h2>
              {finished.map((a) => (
                <PastAttempt key={a.id} problem={problem} attempt={a} />
              ))}
            </section>
          )}
        </div>
      )}
    </PageFrame>
  );
}
