// The summit profile's past weeks (12.10.7), from the stores: each week's readiness evaluated on
// the records as they were at that Sunday 23:59 (lib/insight/summit). Computed after first paint,
// one week per idle moment so the page stays responsive, and cached for the visit (a week is
// used again while the records up to its end are unchanged).
import { useEffect, useState } from "react";
import {
  endOfDay,
  firstDataDay,
  readinessAsOf,
  recordsFingerprint,
  recordTimes,
  summitSundays,
} from "@/lib/insight/summit";
import { PACE_DAYS } from "@/lib/insight/dashboard";
import type { ReadinessModel } from "@/lib/readiness/model";
import { addDaysToDate } from "@/lib/time";
import { useActivityStore } from "@/stores/activityStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { isActiveDay } from "@/lib/activity/streak";
import { evaluationSourcesNow } from "./useInsight";

export interface SubjectScore {
  subjectId: string;
  weight: number;
  readiness: number;
}

/** One week's point: the readiness at the end of `day` and what it was made of. */
export interface SummitPoint {
  day: string;
  overall: number;
  totalWeight: number;
  subjects: SubjectScore[];
  strong: number;
  concepts: number;
}

export function pointOf(day: string, model: ReadinessModel): SummitPoint {
  return {
    day,
    overall: model.overall,
    totalWeight: model.totalWeight,
    subjects: model.subjects
      .filter((s) => s.weight > 0)
      .map((s) => ({ subjectId: s.subjectId, weight: s.weight, readiness: s.readiness })),
    strong: model.counts.strong,
    concepts: model.byId.size,
  };
}

const cache = new Map<string, SummitPoint>();

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

export interface SummitState {
  /** Finished weeks, oldest first (their Sundays). */
  weeks: SummitPoint[];
  /** Readiness at the end of the day 14 days ago, for the projection's pace. */
  before: SummitPoint | null;
  /** Weeks still being worked out. */
  pending: number;
}

/** The past weeks for `today`, filled in after first paint. */
export function useSummit(today: string): SummitState {
  const checks = useConceptStateStore((s) => s.checks);
  const problems = useProblemStore((s) => s.states);
  const profile = useProfileStore((s) => s.profile);
  const months = useActivityStore((s) => s.months);
  const [state, setState] = useState<SummitState>({ weeks: [], before: null, pending: 0 });

  useEffect(() => {
    const src = evaluationSourcesNow(endOfDay(today));
    if (!src) return;
    const activeDays: string[] = [];
    for (const m of Object.values(months))
      for (const [day, d] of Object.entries(m.days)) if (isActiveDay(d)) activeDays.push(day);
    const sundays = summitSundays(firstDataDay(src, activeDays), today);
    const beforeDay = addDaysToDate(today, -PACE_DAYS);
    const days = sundays.length ? [...sundays, beforeDay] : [];
    const results = new Map<string, SummitPoint>();
    const times = recordTimes(src);
    const keyOf = (day: string) => `${day}|${recordsFingerprint(src, day, times)}`;
    const todo: string[] = [];
    for (const day of days) {
      const hit = cache.get(keyOf(day));
      if (hit) results.set(day, hit);
      else todo.push(day);
    }
    const publish = () =>
      setState({
        weeks: sundays.flatMap((d) => (results.has(d) ? [results.get(d)!] : [])),
        before: results.get(beforeDay) ?? null,
        pending: todo.length,
      });
    const w = window as IdleWindow;
    let timer = 0;
    let cancelled = false;
    const step = () => {
      if (cancelled) return;
      const day = todo.shift();
      if (day) {
        const point = pointOf(day, readinessAsOf(src, day));
        cache.set(keyOf(day), point);
        results.set(day, point);
      }
      // Publish every few weeks (and at the end) so the profile grows without a render per week.
      if (todo.length === 0 || todo.length % 4 === 0) publish();
      if (todo.length) schedule();
    };
    const schedule = () => {
      timer = w.requestIdleCallback
        ? w.requestIdleCallback(step, { timeout: 500 })
        : window.setTimeout(step, 16);
    };
    // After first paint: even cached weeks wait for the browser to be idle, so the page paints
    // first and the rest of the dashboard never waits for the profile.
    if (todo.length) schedule();
    else
      timer = w.requestIdleCallback
        ? w.requestIdleCallback(publish, { timeout: 500 })
        : window.setTimeout(publish, 16);
    return () => {
      cancelled = true;
      if (w.cancelIdleCallback) w.cancelIdleCallback(timer);
      window.clearTimeout(timer);
    };
  }, [today, checks, problems, profile, months]);

  return state;
}
