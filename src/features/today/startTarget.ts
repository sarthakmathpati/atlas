// Where a plan item's Start goes (F16): a link to its screen, or a dialog opened in place
// (flashcards, a concept review). Shared by Up next, the route and ADHD mode's Now card.
import { routeHref } from "@/app/router";
import type { PlanItem } from "@/lib/types";
import { openConceptReview, openFlashcards } from "@/stores/conceptDialogStore";

/** Where Start goes: a link, or a dialog opened in place (flashcards, a concept review). */
export function startTarget(item: PlanItem): { href: string } | { run: () => void } | null {
  const ref = item.refId;
  switch (item.kind) {
    case "resolve":
      return ref ? { href: routeHref("/problems", ref, { mode: "resolve" }) } : null;
    case "new-problem":
      return ref ? { href: routeHref("/problems", ref) } : null;
    case "learn-concept":
      return ref ? { href: routeHref("/map", undefined, { focus: ref }) } : null;
    case "review-concept": {
      const ids = item.refIds?.length ? item.refIds : ref ? [ref] : [];
      if (ids.length === 0) return null;
      if (ids.length === 1 && item.origin !== "planner")
        return { run: () => openConceptReview(ids[0]!) };
      return { run: () => openFlashcards({ conceptIds: ids, title: item.title, session: true }) };
    }
    case "drill":
      return { href: "#/drill" };
    case "revision":
      return {
        href: routeHref("/revision", undefined, { scope: ref === "revision-day" ? "day" : "week" }),
      };
    case "mental-math":
      return { href: routeHref("/mental-math", undefined, { mode: "speed" }) };
    case "mock":
      return { href: routeHref("/mock", undefined, { type: "dsa" }) };
    case "design":
      return ref ? { href: routeHref("/designs", ref) } : null;
    case "story":
      return { href: routeHref("/stories", undefined, ref ? { question: ref } : undefined) };
    case "thought":
      // A parked thought is the owner's own note: it has no screen, only Done.
      return null;
  }
}
