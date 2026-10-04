// Starting help (F32, part 7): an if-then line on Today, "When I ___, I'll start the first stop".
// The owner keeps it for the day or as a default. If the "when" names a clock time ("at 7 pm",
// "it's 19:30"), Atlas shows the line at that time while it's open.
import type { AdhdPrefs } from "@/lib/types";

export const START_LINE_MAX = 120;

/** The "when" for a day: that day's own line, else the default. Empty when there is none. */
export function startWhenFor(
  adhd: Pick<AdhdPrefs, "startWhen" | "startWhenDay"> | undefined,
  date: string,
): string {
  if (adhd?.startWhenDay?.date === date && adhd.startWhenDay.text.trim()) {
    return adhd.startWhenDay.text.trim();
  }
  return adhd?.startWhen?.trim() ?? "";
}

/** Whether the shown line is just for today. */
export function startWhenIsToday(
  adhd: Pick<AdhdPrefs, "startWhenDay"> | undefined,
  date: string,
): boolean {
  return adhd?.startWhenDay?.date === date && adhd.startWhenDay.text.trim() !== "";
}

/** Tidies the typed "when": one line, no leading "when", no trailing punctuation. */
export function cleanWhen(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^when\s+/i, "")
    .replace(/[.,;:!?\s]+$/, "")
    .slice(0, START_LINE_MAX);
}

/** The whole line: "When I finish dinner, I'll start the first stop." */
export function startLineSentence(when: string): string {
  const w = cleanWhen(when);
  return `When ${w}, I'll start the first stop.`;
}

/**
 * The clock time a "when" names, in minutes after midnight, or null. Understands "7 pm",
 * "7:30pm", "7.30 p.m.", "19:30", "at 7am", "noon" and "midnight". A bare "7" is too vague.
 */
export function clockInText(text: string): number | null {
  const t = text.toLowerCase();
  if (/\bnoon\b|\bmidday\b/.test(t)) return 12 * 60;
  if (/\bmidnight\b/.test(t)) return 0;
  const meridiem = /\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/.exec(t);
  if (meridiem) {
    let h = Number(meridiem[1]);
    const m = meridiem[2] ? Number(meridiem[2]) : 0;
    if (h < 1 || h > 12 || m > 59) return null;
    const pm = meridiem[3]!.startsWith("p");
    if (h === 12) h = 0;
    return (pm ? h + 12 : h) * 60 + m;
  }
  const h24 = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/.exec(t);
  if (h24) return Number(h24[1]) * 60 + Number(h24[2]);
  return null;
}

/** The time as the owner reads it: "19:30". */
export function clockLabel(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

/** The line shows as a reminder from its time until an hour after it. */
export const START_REMINDER_WINDOW_MIN = 60;

/** True while the reminder for a "when" with a clock time is due (from the time, for an hour). */
export function startReminderDue(when: string, now: Date): boolean {
  const minute = clockInText(when);
  if (minute === null) return false;
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  return nowMinute >= minute && nowMinute < minute + START_REMINDER_WINDOW_MIN;
}
