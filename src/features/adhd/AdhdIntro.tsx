// The card shown the first time ADHD mode is turned on (F32): what changed, in a few short lines,
// and a link to its settings, where each part can be turned off on its own.
import { Check, Settings2 } from "lucide-react";
import { navigate } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ADHD_PARTS } from "@/lib/adhd/prefs";
import type { AdhdPart } from "@/lib/types";
import { closeAdhdIntro, useAdhd, useAdhdUi } from "@/stores/adhdStore";

/** One short line per part for the card. */
const CHANGED: Record<AdhdPart, [string, string]> = {
  calm: ["Calm screen", "fewer things on screen, larger text, and nothing in red."],
  nowCard: ["The Now card", "Today shows one task at a time, in small steps."],
  time: ["Time you can see", "a shrinking disc on timed work, and estimates that learn your pace."],
  place: ["Keep your place", "after a break, a card shows where you left off."],
  rewards: ["Rewards right away", "ink for every finished step, a flag for every finished day."],
  breaks: ["Breaks that work", ""],
  startHelp: ["Starting help", "an if-then line on Today for when you'll start."],
  reading: ["Reading support", "lessons one part at a time, with read aloud."],
  gentle: ["Gentle language", "a fresh start when reviews pile up, and a welcome back after a gap."],
};

export function AdhdIntro() {
  const open = useAdhdUi((s) => s.introOpen);
  const adhd = useAdhd();
  const parts = ADHD_PARTS.filter((p) => adhd.parts[p]);
  return (
    <Dialog
      open={open}
      onClose={closeAdhdIntro}
      title="ADHD mode is on"
      description="Supports for starting, time and focus, where the work happens. Each part can be turned off on its own."
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            icon={Settings2}
            onClick={() => {
              closeAdhdIntro();
              navigate("/settings?section=adhd");
            }}
          >
            Open its settings
          </Button>
          <Button variant="primary" onClick={closeAdhdIntro}>
            Got it
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <p className="text-base text-text">What changed:</p>
        <ul className="space-y-2">
          {parts.map((p) => (
            <li key={p} className="flex gap-2.5 text-base">
              <Check size={16} aria-hidden="true" className="mt-1 shrink-0 text-accent" />
              <span>
                <span className="font-semibold text-text">{CHANGED[p][0]}:</span>{" "}
                <span className="text-muted">
                  {p === "breaks"
                    ? `focus blocks of ${adhd.blockMinutes} minutes with ${adhd.breakMinutes}-minute breaks.`
                    : CHANGED[p][1]}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          Focus sound and Study with Claude stay off until you choose them. ADHD mode supports study
          habits; it doesn't treat ADHD.
        </p>
      </div>
    </Dialog>
  );
}
