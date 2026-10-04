// A plan item's minutes on the route and Up next (F32 "time you can see"): with ADHD mode's time
// part on, a finished item says "Planned 15, took 22" and the others add their estimate at the
// owner's pace ("15 min, about 22"). Otherwise just "15 min", as before.
import { plannedTook } from "@/lib/adhd/pace";
import type { PlanItem } from "@/lib/types";
import { useAdhdPart } from "@/stores/adhdStore";
import { useEstimate } from "./hooks";

export function ItemMinutes({ item }: { item: PlanItem }) {
  const on = useAdhdPart("time");
  const { planned, atPace } = useEstimate(item);
  if (!on) return <>{item.estMinutes} min</>;
  if (item.done && item.took !== undefined) return <>{plannedTook(planned, item.took)}</>;
  return (
    <>
      {planned} min{atPace !== null && <span className="text-faint">, about {atPace}</span>}
    </>
  );
}
