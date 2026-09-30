// The owner's focus subjects (Settings → Profile, or the weekly review's suggestion), shown as
// links with their square marks in the sidebar and the More sheet (12.10.8).
import { subjectById } from "@/data/syllabus";
import type { Subject } from "@/lib/types";
import { useProfileStore } from "@/stores/profileStore";
import { routeHref } from "../router";

export function useFocusSubjects(): Subject[] {
  const ids = useProfileStore((s) => s.profile?.focusSubjects);
  return (ids ?? []).flatMap((id) => {
    const subject = subjectById.get(id);
    return subject ? [subject] : [];
  });
}

/** A focus subject opens its region on the map. */
export const focusSubjectHref = (id: string) => routeHref("/map", undefined, { subject: id });
