// Notices above every page: storage problems, the storage notice from startup (for example "saved
// in this browser only"), the gentle backup reminder (F22), parked thoughts that came back and
// the wrap-up note before bedtime (F31), and ADHD mode's "Where you left off" (F32). While a focus
// block runs, the reminders wait for the break (held notices); storage problems still show at once.
import { CloudOff, Download, HardDrive, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Misc";
import { PlaceCard } from "@/features/adhd/PlaceCard";
import { useHoldingNotices } from "@/features/focus/hooks";
import { ParkedBack } from "@/features/focus/ParkedBack";
import { WrapUpNote } from "@/features/focus/WrapUpNote";
import { backupReminderDue, exportBackup, relativeDay } from "@/features/settings/backup";
import { nowIso } from "@/lib/time";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { useServicesState } from "../providers/servicesContext";

export function ShellNotices() {
  const state = useServicesState();
  const profile = useProfileStore((s) => s.profile);
  const update = useProfileStore((s) => s.update);
  const [noticeHidden, setNoticeHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const holding = useHoldingNotices();

  const notices = [];
  if (state.status === "error") {
    notices.push(
      <Callout
        key="error"
        tone="danger"
        icon={TriangleAlert}
        title="Your data couldn't be opened"
        actions={
          <Button size="sm" onClick={state.retry}>
            Try again
          </Button>
        }
      >
        {state.message}
      </Callout>,
    );
  }
  if (state.status === "ready" && state.services.storageNotice && !noticeHidden) {
    notices.push(
      <Callout
        key="storage"
        tone="warning"
        icon={state.services.repository.kind === "memory" ? HardDrive : CloudOff}
        actions={
          <Button size="sm" variant="ghost" onClick={() => setNoticeHidden(true)}>
            Got it
          </Button>
        }
      >
        {state.services.storageNotice}
      </Callout>,
    );
  }
  if (state.status === "ready" && profile && !holding && backupReminderDue(profile)) {
    const services = state.services;
    notices.push(
      <Callout
        key="backup"
        icon={Download}
        title="Time for a backup"
        actions={
          <>
            <Button
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const result = await exportBackup(services);
                setBusy(false);
                if (result.message)
                  toast(result.message, { tone: result.ok ? "success" : "error" });
              }}
            >
              Export backup
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => update({ backupReminderDismissedAt: nowIso() })}
            >
              Not now
            </Button>
          </>
        }
      >
        {profile.lastBackupAt
          ? `Your last backup was ${relativeDay(profile.lastBackupAt)}. A fresh one keeps your work safe.`
          : "You haven't exported a backup yet. One file keeps all your progress safe."}
      </Callout>,
    );
  }
  // The focus layer's notes decide for themselves whether to show; the strip collapses when
  // nothing in it rendered.
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pt-4 empty:hidden sm:px-6 lg:px-10 print:hidden">
      {notices}
      {state.status === "ready" && <PlaceCard />}
      {state.status === "ready" && <WrapUpNote />}
      {state.status === "ready" && <ParkedBack />}
    </div>
  );
}
