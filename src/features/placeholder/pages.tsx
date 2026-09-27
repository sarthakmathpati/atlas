// The page for links that match no route. (The "Arrives in phase N" pages for later features
// were retired in Phase 8, once every route had its real page.)
import { Compass } from "lucide-react";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { MOD_KEY } from "@/components/ui/platform";
import { syllabus } from "@/data/syllabus";

export function NotFoundPage() {
  return (
    <PageFrame>
      <PageHeader title="Page not found" />
      <EmptyState
        icon={Compass}
        title="This link doesn't match any page"
        actions={
          <>
            <Button href="#/today" variant="primary">
              Go to Today
            </Button>
            <Button href="#/map">Browse the syllabus</Button>
          </>
        }
      >
        It may be from an older version of Atlas. Every page is in the sidebar, and {MOD_KEY} K
        searches all {syllabus.counts.concepts} concepts.
      </EmptyState>
    </PageFrame>
  );
}
