// Hooks for ADHD mode's screens (F32): the chime as a clock passes half time and 2 minutes
// left, and an item's estimate at the owner's pace.
import { useEffect, useRef } from "react";
import { scaleMinutes } from "@/lib/adhd/pace";
import { cuesCrossed, timeCues } from "@/lib/adhd/time";
import type { PlanItem } from "@/lib/types";
import { useAdhd, useAdhdPart } from "@/stores/adhdStore";
import { usePace } from "@/stores/paceStore";
import { playChime } from "./sound";

/** Sounds the chime as a running clock crosses half time and 2 minutes left. */
export function useTimeCues(elapsedMs: number, totalMs: number, running: boolean, key: string) {
  const adhd = useAdhd();
  const on = adhd.on && adhd.parts.time && adhd.chime === true;
  const volume = adhd.volume;
  const last = useRef<{ key: string; elapsed: number } | null>(null);
  useEffect(() => {
    const prev = last.current;
    last.current = { key, elapsed: elapsedMs };
    if (!on || !running || !prev || prev.key !== key) return;
    if (cuesCrossed(prev.elapsed, elapsedMs, timeCues(totalMs)).length > 0) playChime(volume);
  }, [elapsedMs, totalMs, running, key, on, volume]);
}

/** "15 min planned, about 22 at your pace" (the pace only with "time you can see" on). */
export function useEstimate(item: Pick<PlanItem, "kind" | "estMinutes">): {
  planned: number;
  atPace: number | null;
} {
  const timeOn = useAdhdPart("time");
  const pace = usePace(item.kind);
  const atPace = timeOn && pace !== null ? scaleMinutes(item.estMinutes, pace) : null;
  return { planned: item.estMinutes, atPace: atPace !== item.estMinutes ? atPace : null };
}
