// A concept as a page (#/concept/<id>, F3, 12.10.8): a page head in the subject's tint with its
// emblem and contour lines, then the same Learn, Practice, Notes and Ask tabs as the map's panel,
// with room for notes and their preview side by side.
import { Map as MapIcon, MoreHorizontal } from "lucide-react";
import { routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { usePageHeading } from "@/app/shell/usePageTitle";
import { Button, IconButton } from "@/components/ui/Button";
import { ContourCanvas } from "@/components/ui/ContourCanvas";
import { SubjectEmblem } from "@/components/ui/SubjectEmblem";
import { useMediaQuery } from "@/components/ui/hooks";
import { PageSkeleton } from "@/components/ui/Misc";
import { Menu } from "@/components/ui/Popover";
import { subjectById } from "@/data/syllabus";
import type { Concept } from "@/lib/types";
import { useConcept, useCustomConceptStore } from "@/stores/customConceptStore";
import { NotFoundPage } from "../placeholder/pages";
import { conceptMenuItems } from "./conceptActions";
import { Breadcrumb, ConceptChips, ConceptTabs } from "./ConceptPanel";
import { usePageFocusLine } from "@/features/focus/hooks";

export default function ConceptPage() {
  const route = useRoute();
  const concept = useConcept(route.id);
  const customLoaded = useCustomConceptStore((s) => s.loaded);
  const wide = useMediaQuery("(min-width: 1024px)");
  usePageFocusLine(concept ? `Learn ${concept.name}` : "", concept?.id ?? null);
  if (!concept) {
    // The owner's own concepts load with the rest of their data.
    if (!customLoaded && route.id?.startsWith("custom."))
      return (
        <PageFrame>
          <PageSkeleton />
        </PageFrame>
      );
    return <NotFoundPage />;
  }
  return (
    <PageFrame className="max-w-5xl">
      <ConceptHead concept={concept} />
      <ConceptTabs key={concept.id} concept={concept} wide={wide} />
    </PageFrame>
  );
}

function ConceptHead({ concept }: { concept: Concept }) {
  const ref = usePageHeading(concept.name);
  const subject = subjectById.get(concept.subjectId);
  return (
    <header
      data-subject={concept.subjectId}
      className="relative isolate mb-6 overflow-hidden rounded-focal bg-subject-tint px-5 py-5 sm:mb-8 sm:px-7 sm:py-6"
    >
      <ContourCanvas seed={`concept:${concept.id}`} levels={10} texture="lines" className="-z-10" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <SubjectEmblem
          subjectId={concept.subjectId}
          size={56}
          label={subject ? `${subject.name} emblem` : undefined}
          className="max-sm:hidden"
        />
        <div className="min-w-0 flex-1">
          <Breadcrumb concept={concept} />
          <h1
            ref={ref}
            tabIndex={-1}
            className="mt-1 mb-3 font-display text-page font-semibold tracking-[-0.01em] text-balance text-text outline-none max-sm:text-2xl"
          >
            {concept.name}
          </h1>
          <ConceptChips concept={concept} />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button icon={MapIcon} href={routeHref("/map", undefined, { focus: concept.id })}>
            Show on the map
          </Button>
          <Menu
            label={`More for ${concept.name}`}
            items={conceptMenuItems(concept, {
              onDeleted: () => window.history.back(),
            })}
            renderTrigger={(props) => (
              <IconButton icon={MoreHorizontal} label="More" variant="secondary" {...props} />
            )}
          />
        </div>
      </div>
    </header>
  );
}
