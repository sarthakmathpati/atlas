// Interview day (F31): on the interview date and the day before, Today opens a calm view.
import { daysBetween } from "@/lib/time";

export type InterviewDay = "today" | "tomorrow";

export function interviewDay(
  today: string,
  interviewDate: string | undefined,
): InterviewDay | null {
  if (!interviewDate) return null;
  const days = daysBetween(today, interviewDate);
  return days === 0 ? "today" : days === 1 ? "tomorrow" : null;
}
