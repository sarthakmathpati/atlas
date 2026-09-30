// The wrap-up note (F31): with a bedtime set in Settings → Appearance, a quiet note shows in the
// 30 minutes before it, with "Park what's left" and "Plan tomorrow" (tonight's parked thoughts
// become the owner's items on tomorrow's plan). Closing it lasts the night. Without a bedtime
// there is no note; during a focus block it waits for the break.
import { Moon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Misc";
import { minutesUntilBedtime, wrapUpDue, wrapUpNight } from "@/lib/focus/bedtime";
import { openPark, planTomorrow } from "@/stores/parkStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { useHoldingNotices, useTicker } from "./hooks";
import { closeWrapUpFor, wrapUpClosedFor } from "./wrapUp";

export function WrapUpNote() {
  const bedtime = useProfileStore((s) => s.profile?.prefs.bedtime);
  const holding = useHoldingNotices();
  const now = useTicker(30_000, Boolean(bedtime));
  const [, setClosed] = useState(0);
  const date = new Date(now);
  const night = wrapUpNight(bedtime, date);
  if (!bedtime || holding || !wrapUpDue(bedtime, date) || wrapUpClosedFor(night)) return null;
  const left = minutesUntilBedtime(bedtime, date) ?? 0;
  return (
    <Callout
      icon={Moon}
      title="Wrap up soon"
      actions={
        <>
          <Button
            size="sm"
            onClick={() => openPark({ when: "tomorrow", title: "Park what's left" })}
          >
            Park what's left
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              const moved = await planTomorrow();
              toast(
                moved === 0
                  ? "Nothing is parked for tonight. Tomorrow's plan is made in the morning."
                  : `${moved} parked ${moved === 1 ? "thought is" : "thoughts are"} on tomorrow's plan.`,
                { tone: moved === 0 ? "neutral" : "success" },
              );
            }}
          >
            Plan tomorrow
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (night) closeWrapUpFor(night);
              setClosed((n) => n + 1);
            }}
          >
            Close
          </Button>
        </>
      }
    >
      Your bedtime is {bedtime}, in {left} {left === 1 ? "minute" : "minutes"}. Park what's left for
      tomorrow and stop on a good note.
    </Callout>
  );
}
