// Shown when a subject's concept text couldn't load (data/content.ts), for example offline right
// after the app was updated. Everything else on the page keeps working.
import { CloudOff, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Misc";

export function ContentUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <Callout
      tone="warning"
      icon={CloudOff}
      actions={
        <Button size="sm" icon={RotateCw} onClick={onRetry}>
          Try again
        </Button>
      }
    >
      The text for this concept didn&rsquo;t load. Check your connection and try again.
    </Callout>
  );
}
