// A concept as a page (#/concept/<id>, F3): the same header and Learn, Practice, Notes and Ask
// tabs as the map's panel, with room for notes and their preview side by side.
import { Map as MapIcon, MoreHorizontal } from "lucide-react";
import { routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button, IconButton } from "@/components/ui/Button";
import { useMediaQuery } from "@/components/ui/hooks";
import { PageSkeleton } from "@/components/ui/Misc";
import { Menu } from "@/components/ui/Popover";
import { useConcept, useCustomConceptStore } from "@/stores/customConceptStore";
import { NotFoundPage } from "../placeholder/pages";
import { conceptMenuItems } from "./conceptActions";
import { Breadcrumb, ConceptChips, ConceptTabs } from "./ConceptPanel";

export default function ConceptPage() {
  const route = useRoute();
  const concept = useConcept(route.id);
  const customLoaded = useCustomConceptStore((s) => s.loaded);
  const wide = useMediaQuery("(min-width: 1024px)");
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
      <PageHeader
        eyebrow={<Breadcrumb concept={concept} />}
        title={concept.name}
        actions={
          <>
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
          </>
        }
      />
      <div className="-mt-3 mb-6">
        <ConceptChips concept={concept} />
      </div>
      <ConceptTabs key={concept.id} concept={concept} wide={wide} />
    </PageFrame>
  );
}
