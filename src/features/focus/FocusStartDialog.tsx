// "In this block I will…" (F31): one line before a focus block starts, filled in from the plan
// item or the page (the owner can change it or leave it empty). Enter starts the block.
import { Timer } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { INTENTION_MAX } from "@/lib/focus/intention";
import {
  cancelAskToStart,
  focusDurations,
  startBlock,
  useFocusTimerStore,
} from "@/stores/focusTimerStore";
import { useProfileStore } from "@/stores/profileStore";

function StartForm({ line, planItemId }: { line: string; planItemId: string | null }) {
  const [value, setValue] = useState(line);
  const prefs = useProfileStore((s) => s.profile?.prefs);
  const { focus, break: rest } = focusDurations(prefs);
  return (
    <form
      className="space-y-4 px-4 py-4 sm:px-5"
      onSubmit={(e) => {
        e.preventDefault();
        startBlock(value, planItemId);
      }}
    >
      <Field
        label="In this block I will…"
        hint={`${focus / 60_000} minutes of focus, then a ${rest / 60_000}-minute break. Press Enter to start.`}
      >
        <Input
          value={value}
          maxLength={INTENTION_MAX}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          placeholder="Re-solve 69. Sqrt(x)"
          autoComplete="off"
          data-autofocus
        />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={cancelAskToStart}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" icon={Timer}>
          Start the block
        </Button>
      </div>
    </form>
  );
}

export function FocusStartDialog() {
  const asking = useFocusTimerStore((s) => s.asking);
  return (
    <Dialog open={asking !== null} onClose={cancelAskToStart} title="Start a focus block" size="sm">
      {asking && <StartForm key={asking.line} line={asking.line} planItemId={asking.planItemId} />}
    </Dialog>
  );
}
