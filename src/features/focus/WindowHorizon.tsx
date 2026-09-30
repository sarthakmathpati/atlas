// The horizon line of a focus block (F31) along the window's top edge, on every page (the
// workspace and mock rounds too). It lives in the top layer so it stays above open dialogs, is
// redrawn every 5 seconds without animating, and stops at the break.
import { useLayoutEffect, useRef } from "react";
import { HorizonLine } from "@/components/ui/Horizon";
import { POPOVER_MANUAL, showInTopLayer } from "@/components/ui/topLayer";
import {
  blockActive,
  focusDurations,
  focusElapsedMs,
  useFocusTimerStore,
} from "@/stores/focusTimerStore";
import { useProfileStore } from "@/stores/profileStore";
import { useTicker } from "./hooks";

export function WindowHorizon() {
  const active = useFocusTimerStore((s) => blockActive(s) && !s.breakOpen);
  const running = useFocusTimerStore((s) => s.running);
  const startedAt = useFocusTimerStore((s) => s.startedAt);
  const accumulatedMs = useFocusTimerStore((s) => s.accumulatedMs);
  const prefs = useProfileStore((s) => s.profile?.prefs);
  const now = useTicker(5_000, active && running);
  const ref = useRef<HTMLDivElement>(null);

  // Re-shown on every step, so a dialog opened since doesn't cover it for long.
  useLayoutEffect(() => {
    if (active) showInTopLayer(ref.current);
  });

  if (!active) return null;
  const total = focusDurations(prefs).focus;
  const elapsed = focusElapsedMs({ startedAt, accumulatedMs }, now);
  return (
    <div
      ref={ref}
      popover={POPOVER_MANUAL}
      data-testid="window-horizon"
      className="pointer-events-none fixed inset-x-0 top-0 bottom-auto z-[80] m-0 h-0.5 w-full overflow-visible border-0 bg-transparent p-0 print:hidden"
    >
      <HorizonLine elapsedMs={elapsed} totalMs={total} className="w-full" />
    </div>
  );
}
