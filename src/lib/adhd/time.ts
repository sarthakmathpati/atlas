// Time you can see (F32, part 3): the shrinking disc and its optional chimes. Like the horizon
// line (F31), the disc moves in whole 5-second steps and never animates; when the time is up it
// stays empty and says how far over it is, in plain words and never in red.
import { horizonFraction } from "@/lib/focus/horizon";

/** The part of the disc still filled (time left), in 5-second steps. */
export function discFraction(elapsedMs: number, totalMs: number): number {
  return horizonFraction(elapsedMs, totalMs);
}

/** Elapsed times at which the chime sounds: half time, and 2 minutes left when that's later. */
export function timeCues(totalMs: number): number[] {
  if (totalMs <= 0) return [];
  const half = totalMs / 2;
  const twoLeft = totalMs - 2 * 60_000;
  return twoLeft > half ? [half, twoLeft] : [half];
}

/** The cues passed between two readings of a clock (each sounds once). */
export function cuesCrossed(fromMs: number, toMs: number, cues: readonly number[]): number[] {
  return cues.filter((c) => c > fromMs && c <= toMs);
}

/** "11:00" style minutes and seconds. */
function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface DiscText {
  /** The big number ("11:00"). */
  main: string;
  /** Under it: "left of 15", "over by 3 min". */
  sub: string;
  /** For screen readers: "11 minutes left of 15". */
  label: string;
}

/** What the disc says for this much time used. */
export function discText(elapsedMs: number, totalMs: number): DiscText {
  const totalMin = Math.round(totalMs / 60_000);
  const left = totalMs - elapsedMs;
  if (left > 0) {
    const minutes = Math.ceil(left / 60_000);
    return {
      main: clock(left),
      sub: `left of ${totalMin}`,
      label: `${minutes} ${minutes === 1 ? "minute" : "minutes"} left of ${totalMin}`,
    };
  }
  const over = Math.floor(-left / 60_000);
  return over < 1
    ? { main: "0:00", sub: "time's up", label: `The ${totalMin} minutes are up` }
    : {
        main: `+${over}`,
        sub: `min over ${totalMin}`,
        label: `${over} ${over === 1 ? "minute" : "minutes"} past the ${totalMin} planned`,
      };
}
