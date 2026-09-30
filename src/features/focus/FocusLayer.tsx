// The focus layer (F31), mounted once in the shell: brings back a block that ran before a
// reload, turns the focus lens on and off (<html data-focus-lens>), and hosts the horizon line,
// "In this block I will…", Park it, the break view and the question after a block.
import { useEffect, useRef } from "react";
import { restoreFocusBlock } from "@/stores/focusTimerStore";
import { useProfileStore } from "@/stores/profileStore";
import { BlockDoneDialog, BreakView } from "./BreakView";
import { FocusStartDialog } from "./FocusStartDialog";
import { useLensOn } from "./hooks";
import { ParkDialog } from "./Park";
import { WindowHorizon } from "./WindowHorizon";

export function FocusLayer() {
  const profileLoaded = useProfileStore((s) => s.profile !== null);
  const restored = useRef(false);
  useEffect(() => {
    // The block's length comes from the profile, so wait for it.
    if (!profileLoaded || restored.current) return;
    restored.current = true;
    restoreFocusBlock();
  }, [profileLoaded]);

  const lens = useLensOn();
  useEffect(() => {
    const root = document.documentElement;
    if (lens) root.setAttribute("data-focus-lens", "");
    else root.removeAttribute("data-focus-lens");
    return () => root.removeAttribute("data-focus-lens");
  }, [lens]);

  return (
    <>
      <WindowHorizon />
      <FocusStartDialog />
      <ParkDialog />
      <BlockDoneDialog />
      <BreakView />
    </>
  );
}
