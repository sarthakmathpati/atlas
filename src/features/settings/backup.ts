// Backups (F22): export everything (never secrets) through the FileSaver adapter, and record when
// the last backup happened so the reminder banner and Settings can show it.
import type { Services } from "@/app/providers/servicesContext";
import { backupFilename } from "@/lib/storage/exportImport";
import { nowIso } from "@/lib/time";
import { useProfileStore } from "@/stores/profileStore";

export interface BackupResult {
  ok: boolean;
  /** What to tell the owner (null when a dialog already shows the file). */
  message: string | null;
}

export async function exportBackup(services: Services): Promise<BackupResult> {
  try {
    const backup = await services.repository.exportAll();
    const result = await services.fileSaver.save({
      filename: backupFilename(),
      data: JSON.stringify(backup, null, 2),
      mime: "application/json",
    });
    if (result.status === "saved" || result.status === "shown-in-dialog") {
      useProfileStore.getState().update({ lastBackupAt: nowIso() });
      return { ok: true, message: result.status === "saved" ? "Backup exported." : null };
    }
    if (result.status === "declined") return { ok: false, message: "Export cancelled." };
    return { ok: false, message: result.message };
  } catch {
    return { ok: false, message: "Couldn't export right now. Try again in a moment." };
  }
}

const DAY_MS = 86_400_000;
export const BACKUP_REMIND_AFTER_DAYS = 7;
export const BACKUP_SNOOZE_DAYS = 3;

/** Whether the gentle backup banner should show (F22). */
export function backupReminderDue(
  profile: {
    lastBackupAt?: string;
    backupReminderDismissedAt?: string;
    createdAt: string;
    prefs: { backupReminder: boolean };
  },
  now: Date = new Date(),
): boolean {
  if (!profile.prefs.backupReminder) return false;
  const since = Date.parse(profile.lastBackupAt ?? profile.createdAt);
  if (Number.isFinite(since) && now.getTime() - since < BACKUP_REMIND_AFTER_DAYS * DAY_MS)
    return false;
  if (profile.backupReminderDismissedAt) {
    const dismissed = Date.parse(profile.backupReminderDismissedAt);
    if (Number.isFinite(dismissed) && now.getTime() - dismissed < BACKUP_SNOOZE_DAYS * DAY_MS)
      return false;
  }
  return true;
}

/** "today", "yesterday", "5 days ago", or a date for anything older than a month. */
export function relativeDay(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(then)) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 31) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
