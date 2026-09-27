// Plain-language reasons for plan items (section 11.4 step 8, section 12.8): specific and kind,
// never guilt-inducing. "Due for review: you solved it alone 7 days ago."
import type { Attempt, Concept, ConceptState } from "@/lib/types";
import { attemptDate } from "../problems/progress";
import { daysBetween } from "../time";

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "today", "yesterday", "7 days ago". */
export function daysAgo(day: string, today: string): string {
  const d = daysBetween(day, today);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

function lastAttemptPhrase(last: Attempt | undefined, today: string): string {
  if (!last) return "";
  const when = daysAgo(attemptDate(last), today);
  switch (last.result) {
    case "solved_alone":
      return `you solved it alone ${when}`;
    case "solved_with_hints":
      return `you solved it with hints ${when}`;
    case "saw_solution":
      return `you saw the solution ${when}, so try it yourself now`;
    case "not_solved":
      return `it didn't come together ${when}`;
    default:
      return `you last tried it ${when}`;
  }
}

export function resolveReason(opts: {
  last: Attempt | undefined;
  today: string;
  tricky: boolean;
  lapses: number;
  /** Pulled forward before the interview: due in this many days. */
  earlyInDays?: number;
}): string {
  const phrase = lastAttemptPhrase(opts.last, opts.today);
  if (opts.earlyInDays !== undefined) {
    const due = opts.earlyInDays === 1 ? "tomorrow" : `in ${opts.earlyInDays} days`;
    return `Due ${due}: an early pass before your interview${phrase ? `; ${phrase}` : ""}.`;
  }
  if (opts.tricky) {
    return `Tricky one: it has slipped ${plural(opts.lapses, "time")}${phrase ? `, and ${phrase}` : ""}.`;
  }
  return phrase ? `Due for review: ${phrase}.` : "Due for review.";
}

export function bundleReason(
  items: readonly { concept: Concept; state?: ConceptState; fading: boolean; daysLate: number }[],
  today: string,
): string {
  const fading = items.filter((i) => i.fading);
  if (fading.length > 0) {
    const first = fading[0]!;
    const last = first.state?.srs.lastReviewedAt;
    const when = last ? daysAgo(last.slice(0, 10), today) : null;
    const rest =
      fading.length > 1 ? ` ${plural(fading.length - 1, "other is", "others are")} fading too.` : "";
    return when && when !== "today"
      ? `Fading: you last reviewed ${first.concept.name} ${when}. A quick round brings it back.${rest}`
      : `Fading: ${first.concept.name} is past its review date. A quick round brings it back.${rest}`;
  }
  const late = Math.max(0, ...items.map((i) => i.daysLate));
  if (items.length === 1) {
    return late > 0
      ? `Due for review ${plural(late, "day")} ago. A short round keeps it fresh.`
      : "Due for review today. A short round keeps it fresh.";
  }
  return late > 0
    ? `${items.length} concepts are due for review, the oldest ${plural(late, "day")} ago.`
    : `${items.length} concepts are due for review today. A short round keeps them fresh.`;
}

export function learnReason(opts: {
  concept: Concept;
  prereqs: readonly { name: string; strong: boolean }[];
  focus: boolean;
  topicName?: string;
}): string {
  const { prereqs } = opts;
  const focus = opts.focus ? " It's in this week's focus." : "";
  if (prereqs.length === 0) {
    const kind = opts.concept.importance === "must" ? "a must-know" : "a good";
    return `Ready to learn: ${kind} starting point${opts.topicName ? ` in ${opts.topicName}` : ""}.${focus}`;
  }
  const names = joinNames(prereqs.slice(0, 2).map((p) => p.name));
  const more = prereqs.length > 2 ? " and more" : "";
  return prereqs.every((p) => p.strong)
    ? `Ready to learn: you're strong in its prerequisites ${names}${more}.${focus}`
    : `Ready to learn: you've started its prerequisites ${names}${more}.${focus}`;
}

/** "1 medium solved alone", "2 easy and 1 medium solved alone", "nothing solved alone yet". */
export function solvedPhrase(alone: { easy: number; medium: number; hard: number }): string {
  const parts: string[] = [];
  if (alone.easy) parts.push(`${alone.easy} easy`);
  if (alone.medium) parts.push(`${alone.medium} medium`);
  if (alone.hard) parts.push(`${alone.hard} hard`);
  return parts.length ? `${joinNames(parts)} solved alone` : "nothing solved alone yet";
}

export function newProblemReason(opts: {
  pattern: string;
  alone: { easy: number; medium: number; hard: number };
  started: boolean;
  nearInterview: boolean;
  /** Before any pattern is ready: an easy start while the basics are being learned. */
  gentle?: boolean;
  difficulty: "easy" | "medium" | "hard";
}): string {
  const solved = solvedPhrase(opts.alone);
  if (opts.gentle)
    return `A gentle start: an easy problem on ${opts.pattern} while you learn the basics.`;
  if (opts.nearInterview)
    return `Before your interview: a medium on your weakest pattern, ${opts.pattern} (${solved}).`;
  if (!opts.started)
    return `Start ${opts.pattern}: its prerequisites are in place, and ${opts.difficulty === "easy" ? "an easy" : `a ${opts.difficulty}`} problem is the way in.`;
  if (opts.difficulty === "medium" && opts.alone.easy >= 2 && opts.alone.medium === 0)
    return `Your weakest pattern: ${opts.pattern}. You've solved 2 easy ones alone, so try a medium.`;
  return `Your weakest pattern: ${opts.pattern} (${solved}).`;
}

export function drillReason(weakest?: { name: string; correct: number; total: number }): string {
  if (weakest)
    return `Your weakest pattern in drills lately is ${weakest.name} (${weakest.correct} of ${weakest.total} right).`;
  return "Naming the pattern fast is half of every coding round. Two minutes a prompt.";
}

export function revisionReason(daysLeft: number, scope: "day" | "week"): string {
  const when = daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
  return scope === "week"
    ? `Your interview is ${when}: one pass over everything that matters, grouped by subject.`
    : `Your interview is ${when}: your mistakes, tricky problems and weak spots on two pages.`;
}
