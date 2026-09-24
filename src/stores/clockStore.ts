// Today's local date (yyyy-mm-dd), kept current across midnight so due lists, badges and
// statuses roll over on their own (F9: "correct across day boundaries in local time").
import { create } from "zustand";
import { localDate } from "@/lib/time";

export const useClockStore = create<{ today: string }>(() => ({ today: localDate() }));

/** Re-reads the date; call on an interval and when the tab becomes visible again. */
export function tickClock(): boolean {
  const today = localDate();
  if (today === useClockStore.getState().today) return false;
  useClockStore.setState({ today });
  return true;
}

export function useToday(): string {
  return useClockStore((s) => s.today);
}
