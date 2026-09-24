// The Practice tab (F3): the problems linked to the concept with difficulty, status and next
// review; a suggested next problem that follows the difficulty ramp; and for patterns, the
// signals that give them away and a code template, plus the pattern drill.
import { ArrowRight, ArrowUpRight, Dumbbell, ListPlus } from "lucide-react";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Chip, DifficultyChip } from "@/components/ui/Chip";
import { EmptyState, Skeleton } from "@/components/ui/Misc";
import { problemLabel, problemsForConcept, problemUrl } from "@/lib/problems/catalog";
import { reviewInfo } from "@/lib/problems/progress";
import { difficultyRamp, suggestNextProblem } from "@/lib/problems/suggest";
import type { Concept } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { useUiStore } from "@/stores/uiStore";
import { ProblemStatusGlyph, ReviewText } from "../problems/parts";
import { problemPageHref } from "../problems/problemUi";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));

const RAMP_TEXT = {
  easy: "Start with an easy one: two easy problems solved alone unlock medium ones.",
  medium: "You've solved two easy ones alone. Medium next: three of those unlock hard ones.",
  hard: "Three medium ones solved alone. Time for a hard one.",
} as const;

export function PracticeTab({ concept }: { concept: Concept }) {
  const states = useProblemStore((s) => s.states);
  const hidePremium = useProfileStore((s) => s.profile?.hidePremium ?? false);
  const intensity = useProfileStore((s) => s.profile?.reviewIntensity ?? "normal");
  const setQuickAddOpen = useUiStore((s) => s.setQuickAddOpen);
  const today = useToday();
  const problems = problemsForConcept(concept.id, states);
  const suggested = suggestNextProblem(problems, states, { hidePremium });
  const ramp = difficultyRamp(problems, states);
  const { signals, template } = concept.content;

  return (
    <div className="space-y-5">
      {suggested && (
        <section
          aria-labelledby={`${concept.id}-next`}
          className="rounded-panel border border-rule bg-surface-sunken/60 p-3"
        >
          <h3 id={`${concept.id}-next`} className="text-sm font-medium text-muted">
            Suggested next problem
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <a
              href={problemPageHref(suggested)}
              className="min-w-0 flex-1 font-medium text-text hover:underline"
            >
              {problemLabel(suggested)}
            </a>
            <DifficultyChip difficulty={suggested.difficulty} />
            <Button
              size="sm"
              variant="primary"
              href={problemPageHref(suggested)}
              trailingIcon={ArrowRight}
            >
              Start
            </Button>
          </div>
          <p className="mt-1.5 text-sm text-muted">{RAMP_TEXT[ramp.target]}</p>
        </section>
      )}

      <section aria-labelledby={`${concept.id}-problems`}>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h3 id={`${concept.id}-problems`} className="text-base font-semibold text-text">
            Linked problems ({problems.length})
          </h3>
          <Button size="sm" variant="ghost" icon={ListPlus} onClick={() => setQuickAddOpen(true)}>
            Add a problem
          </Button>
        </div>
        {problems.length === 0 ? (
          <p className="text-base text-muted">
            No problems are linked to this concept yet. Add your own and tag it with this concept.
          </p>
        ) : (
          <ul className="divide-y divide-rule rounded-control border border-rule">
            {problems.map((p) => {
              const state = states[p.id];
              const url = problemUrl(p, state);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <ProblemStatusGlyph state={state} />
                  <a
                    href={problemPageHref(p)}
                    className="min-w-0 flex-1 text-base text-text hover:underline"
                  >
                    {problemLabel(p)}
                  </a>
                  {p.custom && <Chip>Mine</Chip>}
                  <DifficultyChip difficulty={p.difficulty} />
                  <ReviewText
                    info={reviewInfo(state, p.difficulty, intensity, today)}
                    className="text-sm"
                  />
                  {url && /leetcode\./.test(url) && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                    >
                      LeetCode
                      <ArrowUpRight size={14} aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {concept.isPattern && (
        <>
          <section aria-labelledby={`${concept.id}-signals`}>
            <h3 id={`${concept.id}-signals`} className="mb-2 text-base font-semibold text-text">
              How to spot it
            </h3>
            {signals && signals.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-base text-text">
                {signals.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-base text-muted">
                The signals for this pattern arrive with its written content.
              </p>
            )}
          </section>
          <section aria-labelledby={`${concept.id}-template`}>
            <h3 id={`${concept.id}-template`} className="mb-2 text-base font-semibold text-text">
              Template
            </h3>
            {template ? (
              <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                <MarkdownView>{template}</MarkdownView>
              </Suspense>
            ) : (
              <p className="text-base text-muted">
                A C++ template for this pattern arrives with its written content.
              </p>
            )}
          </section>
          <EmptyState
            icon={Dumbbell}
            title="Drill this pattern"
            compact
            actions={
              <Button size="sm" href="#/drill">
                About pattern drills
              </Button>
            }
          >
            Short original prompts where you spot the technique in two minutes. Pattern drills
            arrive in phase 8.
          </EmptyState>
        </>
      )}
    </div>
  );
}
