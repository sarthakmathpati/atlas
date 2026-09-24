// "Why this color?" (F3, F4): the evidence behind a concept's status, read from the same
// calculation that sets it (section 11.2), so the popover and the color can never disagree.
import { useMemo } from "react";
import { Popover } from "@/components/ui/Popover";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { STATUS_LABEL } from "@/components/ui/labels";
import { cx } from "@/components/ui/cx";
import {
  CHECK_WEIGHT,
  computeStatus,
  knowledgeDetails,
  practiceBreakdown,
  PRACTICE_TARGET,
  type CheckKind,
} from "@/lib/mastery/status";
import { relativeDate, weekdayDate } from "@/lib/problems/progress";
import { daysBetween, localDate } from "@/lib/time";
import type { Difficulty, Status } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { refreshConcepts, statusInput, useConceptStateStore } from "@/stores/conceptStateStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";

const KIND_LABEL: Record<CheckKind, string> = {
  explain: "Explain it back",
  quiz: "Quick quiz",
  flashcard: "Flashcards",
  drill: "Pattern drill",
  manual: "Set strong by you",
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** The live evaluation of one concept, recomputed whenever its evidence changes. */
function useStatusExplanation(conceptId: string) {
  const state = useConceptStateStore((s) => s.states[conceptId]);
  const checks = useConceptStateStore((s) => s.checks[conceptId]);
  const problems = useProblemStore((s) => s.states);
  const intensity = useProfileStore((s) => s.profile?.reviewIntensity);
  const today = useToday();
  return useMemo(() => {
    const now = new Date();
    const input = statusInput(conceptId, now);
    if (!input) return null;
    const result = computeStatus(input);
    const automatic = input.state?.manualStatus
      ? computeStatus({ ...input, state: { ...input.state, manualStatus: undefined } }).status
      : result.status;
    return {
      input,
      result,
      automatic,
      knowledge: knowledgeDetails(input.checks, input.state, now),
      practice: practiceBreakdown(input.linked),
    };
    // Re-evaluate when any piece of evidence changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptId, state, checks, problems, intensity, today]);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-rule pt-2.5 first:border-t-0 first:pt-0">
      <p className="mb-1 text-sm font-medium text-text">{title}</p>
      <div className="space-y-1 text-sm text-muted">{children}</div>
    </div>
  );
}

function countLine(counts: Record<Difficulty, number>): string {
  return `${counts.easy} easy, ${counts.medium} medium, ${counts.hard} hard`;
}

export function WhyThisColorContent({ conceptId }: { conceptId: string }) {
  const data = useStatusExplanation(conceptId);
  const today = localDate();
  if (!data) return null;
  const { input, result, automatic, knowledge, practice } = data;
  const state = input.state;
  const srs = state?.srs;
  const manual = state?.manualStatus;

  return (
    <div className="w-[min(340px,calc(100vw-40px))] space-y-2.5">
      <div className="flex items-center gap-2">
        <StatusGlyph status={result.status} size={18} />
        <p className="text-base font-semibold text-text">{STATUS_LABEL[result.status]}</p>
      </div>
      {manual && (
        <p className="text-sm text-muted">
          You set this to {STATUS_LABEL[manual].toLowerCase()}
          {manual === "strong" && result.status === "fading"
            ? ", and a review is overdue, so it shows as fading"
            : ""}
          . From the evidence alone it would be {STATUS_LABEL[automatic].toLowerCase()}.
        </p>
      )}
      {!manual && !result.evidence && (
        <p className="text-sm text-muted">
          No evidence yet: study it, take a quick check, or solve a linked problem.
        </p>
      )}

      <Section title={`Knowledge ${pct(result.knowledge)}`}>
        {knowledge.sources.length === 0 &&
          !knowledge.studiedFloor &&
          !knowledge.selfAssessedFloor && <p>No checks in the last 180 days.</p>}
        {knowledge.sources.map((s, i) => (
          <p key={s.kind} className={cx(i === 0 && "text-text")}>
            {KIND_LABEL[s.kind]}: {pct(s.raw)}
            {CHECK_WEIGHT[s.kind] !== 1 && ` × ${CHECK_WEIGHT[s.kind]} = ${pct(s.weighted)}`}
            {s.count > 1 && `, average of ${s.count}`},{" "}
            {relativeDate(localDate(new Date(s.at)), today).toLowerCase()}
            {i === 0 && " (the best counts)"}
          </p>
        ))}
        {knowledge.stale && <p>Your newest check is over 120 days old, so it counts 80%.</p>}
        {knowledge.studiedFloor && <p>Marked as studied: at least 30%.</p>}
        {knowledge.selfAssessedFloor && (
          <p>From your self-assessment: {pct(state?.selfAssessed ?? 0)} until you take a check.</p>
        )}
      </Section>

      {result.hasLinkedProblems && (
        <Section title={`Practice ${pct(result.practice)}`}>
          <p>
            Solved alone (latest attempt): {countLine(practice.alone)} of{" "}
            {countLine(practice.total)}.
          </p>
          {practice.withHints.easy + practice.withHints.medium + practice.withHints.hard > 0 && (
            <p>With hints: {countLine(practice.withHints)} (these count half).</p>
          )}
          <p>Easy counts 0.5, medium 1, hard 1.5; {PRACTICE_TARGET} points make 100%.</p>
        </Section>
      )}

      <Section title="Reviews">
        {!srs?.dueAt ? (
          <p>Not in review yet. Mark it studied or take a check to start.</p>
        ) : (
          <>
            {srs.lastReviewedAt && (
              <p>
                Last reviewed{" "}
                {relativeDate(localDate(new Date(srs.lastReviewedAt)), today).toLowerCase()}.
              </p>
            )}
            <p>
              {daysBetween(today, srs.dueAt) > 0
                ? `Next review ${weekdayDate(srs.dueAt, today)}.`
                : daysBetween(srs.dueAt, today) === 0
                  ? "Due for review today."
                  : `Review was due ${weekdayDate(srs.dueAt, today)} (${daysBetween(srs.dueAt, today)} days ago).`}
            </p>
          </>
        )}
        {result.overdue && !state?.neverFade && (
          <p className="text-text">
            It's past its review by more than the grace period, so it can fade.
          </p>
        )}
        {state?.neverFade && (
          <p>Never fade is on: it stays strong even when a review is overdue.</p>
        )}
      </Section>

      <Section title="What would turn it green">
        {result.status === "strong" ? (
          <p>It's strong. Review it when it's due to keep it that way.</p>
        ) : result.toGreen.length === 0 ? (
          <p>Its evidence already meets the bar; clear the manual status to see it.</p>
        ) : (
          <ul className="list-disc space-y-0.5 pl-4 text-text">
            {result.toGreen.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/** The status chip; clicking it opens "Why this color?". */
export function StatusChipButton({ conceptId, status }: { conceptId: string; status: Status }) {
  return (
    <Popover
      label="Why this color?"
      placement="bottom-start"
      onOpenChange={(open) => {
        // Make sure the cached color is today's before explaining it.
        if (open) refreshConcepts([conceptId]);
      }}
      renderTrigger={(props) => (
        <button
          type="button"
          {...props}
          className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-rule bg-surface px-2 text-xs font-medium whitespace-nowrap text-text hover:border-rule-strong max-md:h-8"
          title="Why this color?"
        >
          <StatusGlyph status={status} size={12} />
          {STATUS_LABEL[status]}
          <span className="sr-only">. Why this color?</span>
        </button>
      )}
    >
      {() => <WhyThisColorContent conceptId={conceptId} />}
    </Popover>
  );
}
