// What the owner can do with a concept, shared by the map's right-click menu, the concept
// panel's menu and the concept page (F2, F3, F4, F25). Each action gives feedback in a toast,
// with Undo where it changes something.
import {
  BookmarkCheck,
  CalendarPlus,
  EyeOff,
  Eye,
  Layers,
  MessageSquareText,
  Route,
  Sparkles,
  SlidersHorizontal,
  Map as MapIcon,
  PanelRightOpen,
  Trash2,
} from "lucide-react";
import { navigate, routeHref, conceptHref } from "@/app/router";
import type { MenuItem } from "@/components/ui/Popover";
import { isCustomConceptId } from "@/lib/concepts/custom";
import type { Concept } from "@/lib/types";
import { openExplainBack, openFlashcards, openStatusDialog } from "@/stores/conceptDialogStore";
import {
  markStudied,
  restoreConceptState,
  setHidden,
  useConceptStateStore,
} from "@/stores/conceptStateStore";
import { deleteCustomConcept, restoreCustomConcept } from "@/stores/customConceptStore";
import { addPlanItems, removePlanItem, usePlanStore } from "@/stores/planStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { localDate } from "@/lib/time";

export function toggleStudied(concept: Concept): void {
  const studied = Boolean(useConceptStateStore.getState().states[concept.id]?.studied);
  const before = markStudied(concept.id, !studied);
  toast(
    studied
      ? `${concept.name} is no longer marked as studied.`
      : `${concept.name} marked as studied. A quick review comes up in a couple of days.`,
    { action: { label: "Undo", onClick: () => restoreConceptState(concept.id, before) } },
  );
}

export function hideConcept(concept: Concept, hidden: boolean): void {
  const before = setHidden(concept.id, hidden);
  toast(
    hidden
      ? `${concept.name} is hidden from the map. Find it again with “Show hidden concepts” in the filters.`
      : `${concept.name} is back on the map.`,
    { action: { label: "Undo", onClick: () => restoreConceptState(concept.id, before) } },
  );
}

/** "Add to today's plan": a learn item (or a review item when it is due). */
export function addConceptToPlan(concept: Concept): void {
  const state = useConceptStateStore.getState().states[concept.id];
  const today = localDate();
  const due = state?.srs.dueAt !== undefined && state.srs.dueAt <= today;
  const added = addPlanItems(
    [
      due
        ? {
            kind: "review-concept",
            refId: concept.id,
            refIds: [concept.id],
            title: `Review: ${concept.name}`,
            reason: "Added by you. It's due for review.",
            estMinutes: 8,
          }
        : {
            kind: "learn-concept",
            refId: concept.id,
            title: `Learn: ${concept.name}`,
            reason: "Added by you from the map.",
            estMinutes: concept.estMinutes,
          },
    ],
    { budget: useProfileStore.getState().profile?.dailyMinutes },
  );
  if (added === 0) {
    toast(`${concept.name} is already on today's plan.`);
    return;
  }
  toast(`${concept.name} added to today's plan.`, {
    action: {
      label: "Undo",
      onClick: () => {
        const plan = usePlanStore.getState().plans[today];
        const item = plan?.items.findLast((i) => i.refId === concept.id);
        if (item) removePlanItem(today, item.id);
      },
    },
  });
}

export function showPath(conceptId: string): void {
  navigate(routeHref("/map", undefined, { path: conceptId }));
}

export function deleteOwnConcept(concept: Concept, after?: () => void): void {
  const record = deleteCustomConcept(concept.id);
  if (!record) return;
  after?.();
  toast(`${concept.name} deleted.`, {
    action: { label: "Undo", onClick: () => restoreCustomConcept(record) },
  });
}

export interface ConceptMenuOptions {
  /** On the map: open the panel (instead of the full page). */
  onOpen?: () => void;
  /** Hide "Show on the map" when already there. */
  onMap?: boolean;
  /** After deleting one of the owner's concepts (for example close the panel). */
  onDeleted?: () => void;
}

/** The concept menu (F2 right-click or long-press, and the panel's "More" menu). */
export function conceptMenuItems(concept: Concept, options: ConceptMenuOptions = {}): MenuItem[] {
  const state = useConceptStateStore.getState().states[concept.id];
  const items: MenuItem[] = [];
  if (options.onOpen)
    items.push({ id: "open", label: "Open", icon: PanelRightOpen, onSelect: options.onOpen });
  items.push(
    {
      id: "studied",
      label: state?.studied ? "Unmark as studied" : "Mark as studied",
      icon: BookmarkCheck,
      onSelect: () => toggleStudied(concept),
    },
    {
      id: "status",
      label: "Set status manually",
      icon: SlidersHorizontal,
      onSelect: () => openStatusDialog(concept.id),
    },
    { id: "sep1", kind: "separator" },
    {
      id: "cards",
      label: "Flashcards",
      icon: Layers,
      onSelect: () =>
        openFlashcards({ conceptIds: [concept.id], title: `Flashcards: ${concept.name}` }),
    },
    {
      id: "explain",
      label: "Explain it back",
      icon: MessageSquareText,
      onSelect: () => openExplainBack(concept.id),
    },
    {
      id: "ask",
      label: "Ask Claude",
      icon: Sparkles,
      onSelect: () => {
        if (!options.onMap) navigate(conceptHref(concept.id));
        useUiStore.getState().setAskOpen(true);
      },
    },
    { id: "sep2", kind: "separator" },
    { id: "path", label: "Show my path here", icon: Route, onSelect: () => showPath(concept.id) },
    {
      id: "plan",
      label: "Add to today's plan",
      icon: CalendarPlus,
      onSelect: () => addConceptToPlan(concept),
    },
  );
  if (!options.onMap) {
    items.push({
      id: "map",
      label: "Show on the map",
      icon: MapIcon,
      onSelect: () => navigate(routeHref("/map", undefined, { focus: concept.id })),
    });
  }
  items.push({
    id: "hide",
    label: state?.hidden ? "Show on the map again" : "Hide from map",
    icon: state?.hidden ? Eye : EyeOff,
    onSelect: () => hideConcept(concept, !state?.hidden),
  });
  if (isCustomConceptId(concept.id)) {
    items.push({
      id: "delete",
      label: "Delete this concept",
      icon: Trash2,
      danger: true,
      onSelect: () => deleteOwnConcept(concept, options.onDeleted),
    });
  }
  return items;
}
