// Notices above every page: storage problems, the storage notice from startup (for example "saved
// in this browser only"), and the gentle backup reminder (F22).
import { CloudOff, Download, HardDrive, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Misc";
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
  if (state.status === "ready" && profile && backupReminderDue(profile)) {
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
  if (notices.length === 0) return null;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pt-4 sm:px-6 lg:px-10">
      {notices}
    </div>
  );
}
