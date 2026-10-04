// Keep your place (F32, part 4): after 10 minutes or more away, "Where you left off" shows the
// last page, the plan item and its step, with a way back. It goes away when closed, followed,
// or once the owner moves to another page.
import { MapPin, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { navigate, useRoute } from "@/app/router";
import { Button, IconButton } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Misc";
import { useAdhdPart } from "@/stores/adhdStore";
import { dismissPlace, usePlaceStore } from "@/stores/placeStore";

export function PlaceCard() {
  const on = useAdhdPart("place");
  const back = usePlaceStore((s) => s.back);
  const route = useRoute();
  const current = `${route.path}${route.query.toString() ? `?${route.query.toString()}` : ""}`;
  // Moving to another page after it showed means the owner has picked up: it goes away.
  const shownAt = useRef<string | null>(null);
  useEffect(() => {
    if (!back) {
      shownAt.current = null;
      return;
    }
    if (shownAt.current === null) shownAt.current = route.path;
    else if (shownAt.current !== route.path) dismissPlace();
  }, [back, route.path]);
  if (!on || !back) return null;
  const { place } = back;
  const elsewhere = place.path.split("?")[0] !== route.path;
  const step = place.step;
  return (
    <Callout
      icon={MapPin}
      title="Where you left off"
      actions={
        <>
          {elsewhere && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                dismissPlace();
                navigate(place.path);
              }}
            >
              Go back there
            </Button>
          )}
          <IconButton size="sm" icon={X} label="Close" onClick={dismissPlace} />
        </>
      }
    >
      {place.title && place.title !== "Atlas" && <>You were on {place.title}. </>}
      {place.item && (
        <>
          Your stop: {place.item}
          {step ? `, step ${step.index + 1} of ${step.count}: ${step.text}` : ""}.
        </>
      )}
      {!place.item && current === place.path && " Carry on from here."}
    </Callout>
  );
}
