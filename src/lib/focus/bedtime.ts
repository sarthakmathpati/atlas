// The wrap-up note (F31): with a bedtime set, a quiet note shows during the 30 minutes before
// it. Without a bedtime there is no note.
import { parseClock } from "@/lib/theme";
import { localDate } from "@/lib/time";

export const WRAP_UP_MINUTES = 30;

/** Whole minutes from `now` until the next bedtime (0 to 1439), or null without one. */
export function minutesUntilBedtime(bedtime: string | undefined, now: Date): number | null {
  const target = parseClock(bedtime);
  if (target === null) return null;
  const minute = now.getHours() * 60 + now.getMinutes();
  return (((target - minute) % 1440) + 1440) % 1440;
}

/** True during the 30 minutes before bedtime (the note goes at bedtime itself). */
export function wrapUpDue(bedtime: string | undefined, now: Date): boolean {
  const left = minutesUntilBedtime(bedtime, now);
  return left !== null && left > 0 && left <= WRAP_UP_MINUTES;
}

/** Which night a note belongs to (the date of the bedtime), so closing it lasts the night. */
export function wrapUpNight(bedtime: string | undefined, now: Date): string | null {
  const left = minutesUntilBedtime(bedtime, now);
  if (left === null) return null;
  return localDate(new Date(now.getTime() + left * 60_000));
}
