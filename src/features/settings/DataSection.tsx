// Settings → Data (F22 in Settings): where data lives, export, import (preview, then merge or
// replace), the backup reminder, and reset. Replace and reset can be undone from the toast for
// the rest of the visit, because Atlas keeps a copy of what was there before.
import { Download, FileText, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { Services } from "@/app/providers/servicesContext";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Switch } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Misc";
import { buildNotesMarkdown, notesFilename } from "@/lib/export/notesMarkdown";
import { prepareRepository } from "@/lib/storage";
import {
  ImportError,
  parseBackup,
  previewBackup,
  type ImportPreview,
} from "@/lib/storage/exportImport";
import type { ImportSummary } from "@/lib/storage/Repository";
import type { AtlasExport } from "@/lib/storage/schemas";
import { TABLE_LABELS, TABLE_NAMES } from "@/lib/storage/tables";
import type { Profile } from "@/lib/types";
import { hydrateAll } from "@/stores/hydrate";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { exportBackup, relativeDay } from "./backup";
import { SettingsRow, SettingsSection } from "./layout";

function whereItLives(services: Services): string {
  switch (services.repository.kind) {
    case "claude-db":
      return "Synced to your Claude account, so it follows you across your devices.";
    case "dexie":
      return "Saved in this browser on this device. Use a backup to move it to another device.";
    default:
      return "Not saved: this browser is blocking storage, so everything is lost when you close the tab.";
  }
}

function summarize(summary: ImportSummary): string {
  let added = 0;
  let updated = 0;
  for (const t of Object.values(summary.tables)) {
    added += t.added;
    updated += t.updated;
  }
  if (added === 0 && updated === 0 && summary.attemptsTrimmed === 0) {
    return "nothing new, your data already matches it";
  }
  const parts = [`${added} added`, `${updated} updated`];
  if (summary.attemptsTrimmed > 0) parts.push(`${summary.attemptsTrimmed} old attempts trimmed`);
  return parts.join(", ");
}

async function restoreSnapshot(services: Services, snapshot: AtlasExport) {
  try {
    await services.repository.importAll(snapshot, "replace");
    await hydrateAll(services.repository);
    toast("Your previous data is back.", { tone: "success" });
  } catch {
    toast("Couldn't restore your previous data. Import a backup file instead.", { tone: "error" });
  }
}

interface PendingImport {
  file: AtlasExport;
  preview: ImportPreview;
  name: string;
}

function ImportDialog({
  pending,
  onClose,
  services,
}: {
  pending: PendingImport | null;
  onClose: () => void;
  services: Services;
}) {
  const [step, setStep] = useState<"choose" | "confirm-replace">("choose");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const ids = useId();

  const close = () => {
    setStep("choose");
    setTyped("");
    onClose();
  };

  const run = async (mode: "merge" | "replace") => {
    if (!pending) return;
    setBusy(true);
    try {
      const snapshot = mode === "replace" ? await services.repository.exportAll() : null;
      const summary = await services.repository.importAll(pending.file, mode);
      await hydrateAll(services.repository);
      close();
      toast(
        `${mode === "merge" ? "Backup merged" : "Data replaced"}: ${summarize(summary)}.`,
        snapshot
          ? {
              tone: "success",
              action: { label: "Undo", onClick: () => void restoreSnapshot(services, snapshot) },
            }
          : { tone: "success" },
      );
    } catch (e) {
      toast(
        e instanceof ImportError ? e.message : "Couldn't import this backup. Nothing was changed.",
        {
          tone: "error",
        },
      );
    } finally {
      setBusy(false);
    }
  };

  const p = pending?.preview;
  const extra = p
    ? TABLE_NAMES.filter(
        (t) => !["conceptStates", "problemStates", "conceptNotes"].includes(t) && p.totals[t] > 0,
      )
    : [];

  return (
    <Dialog
      open={Boolean(pending)}
      onClose={close}
      title={step === "choose" ? "Import this backup?" : "Replace all your data?"}
      description={
        pending
          ? `${pending.name}, exported ${relativeDay(pending.preview.exportedAt)}.`
          : undefined
      }
      size="md"
      footer={
        step === "choose" ? (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => setStep("confirm-replace")} disabled={busy}>
              Replace my data
            </Button>
            <Button variant="primary" onClick={() => void run("merge")} disabled={busy}>
              Merge into my data
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep("choose")} disabled={busy}>
              Back
            </Button>
            <Button
              variant="danger"
              onClick={() => void run("replace")}
              disabled={busy || typed.trim() !== "REPLACE"}
            >
              Replace everything
            </Button>
          </>
        )
      }
    >
      {p && step === "choose" && (
        <div className="space-y-4 px-4 py-4 sm:px-5">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-control border border-rule bg-rule">
            {[
              ["Concept progress", p.conceptStates],
              ["Problems", p.problems],
              ["Attempts", p.attempts],
              ["Notes", p.notes],
            ].map(([label, n]) => (
              <div key={label} className="bg-surface-raised px-3 py-2">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="text-lg font-medium text-text tabular-nums">{n}</dd>
              </div>
            ))}
          </dl>
          {extra.length > 0 && (
            <p className="text-sm text-muted">
              Also: {extra.map((t) => `${p.totals[t]} ${TABLE_LABELS[t]}`).join(", ")}.
            </p>
          )}
          <p className="text-base text-muted">
            <strong className="font-medium text-text">Merge</strong> keeps everything you have and
            adds what's new; where both have the same item, the newer one wins.{" "}
            <strong className="font-medium text-text">Replace</strong> deletes your current data
            first.
          </p>
        </div>
      )}
      {step === "confirm-replace" && (
        <div className="space-y-3 px-4 py-4 sm:px-5">
          <p className="text-base text-muted">
            Everything in Atlas now is deleted and replaced by this backup. You can undo it from the
            message that appears afterwards, until you leave the page.
          </p>
          <label htmlFor={`${ids}-confirm`} className="block text-sm font-medium text-text">
            Type REPLACE to confirm
          </label>
          <Input
            id={`${ids}-confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </div>
      )}
    </Dialog>
  );
}

function ResetDialog({
  open,
  onClose,
  services,
}: {
  open: boolean;
  onClose: () => void;
  services: Services;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const ids = useId();
  const close = () => {
    setTyped("");
    onClose();
  };
  const reset = async () => {
    setBusy(true);
    try {
      const snapshot = await services.repository.exportAll();
      await services.repository.clearAll();
      await prepareRepository(services.repository);
      await services.repository.flush();
      await hydrateAll(services.repository);
      close();
      toast("All data deleted.", {
        action: { label: "Undo", onClick: () => void restoreSnapshot(services, snapshot) },
      });
    } catch {
      toast("Couldn't delete everything. Reload the page and try again.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Delete all your data?"
      description="Progress, problems, attempts, notes and settings are all removed."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => void reset()}
            disabled={busy || typed.trim() !== "RESET"}
          >
            Delete everything
          </Button>
        </>
      }
    >
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <p className="text-base text-muted">
          Export a backup first if you might want any of it later.
        </p>
        <Button
          icon={Download}
          onClick={async () => {
            const result = await exportBackup(services);
            if (result.message) toast(result.message, { tone: result.ok ? "success" : "error" });
          }}
        >
          Export backup
        </Button>
        <div className="pt-2">
          <label htmlFor={`${ids}-reset`} className="block text-sm font-medium text-text">
            Type RESET to confirm
          </label>
          <Input
            id={`${ids}-reset`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="mt-1.5"
          />
        </div>
      </div>
    </Dialog>
  );
}

export function DataSection({ profile, services }: { profile: Profile; services: Services }) {
  const updatePrefs = useProfileStore((s) => s.updatePrefs);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ids = useId();

  const onExport = async () => {
    setBusy(true);
    const result = await exportBackup(services);
    setBusy(false);
    if (result.message) toast(result.message, { tone: result.ok ? "success" : "error" });
  };

  const onExportNotes = async () => {
    setBusy(true);
    try {
      const [notes, problems] = await Promise.all([
        services.repository.conceptNotes.list(),
        services.repository.problemStates.list(),
      ]);
      const { markdown, count } = buildNotesMarkdown(notes, problems);
      const result = await services.fileSaver.save({
        filename: notesFilename(),
        data: markdown,
        mime: "text/markdown",
      });
      if (result.status === "saved")
        toast(
          count
            ? `Exported ${count} ${count === 1 ? "note" : "notes"}.`
            : "Exported. There are no notes yet.",
          {
            tone: "success",
          },
        );
      else if (result.status === "failed") toast(result.message, { tone: "error" });
    } catch {
      toast("Couldn't export your notes right now. Try again in a moment.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackup(text);
      setPending({ file: parsed, preview: previewBackup(parsed), name: file.name });
    } catch (e) {
      toast(
        e instanceof ImportError
          ? e.message
          : "Couldn't read that file. Choose a backup exported from Atlas.",
        {
          tone: "error",
        },
      );
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <SettingsSection
      id="data"
      title="Data"
      description="Your data belongs to you. Back it up, move it, or start over."
    >
      <SettingsRow label="Where it's saved" description={whereItLives(services)}>
        <span className="text-sm text-muted">
          {services.repository.kind === "claude-db"
            ? "Synced"
            : services.repository.kind === "dexie"
              ? "This browser"
              : "Not saved"}
        </span>
      </SettingsRow>
      {services.storageNotice && (
        <div className="px-4 py-3 sm:px-5">
          <Callout tone="warning">{services.storageNotice}</Callout>
        </div>
      )}
      <SettingsRow
        label="Backup"
        description={
          profile.lastBackupAt
            ? `Last backup: ${relativeDay(profile.lastBackupAt)}. One JSON file with everything except your API key.`
            : "Last backup: never. One JSON file with everything except your API key."
        }
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={Download} onClick={() => void onExport()} disabled={busy}>
            Export backup
          </Button>
          <Button icon={Upload} onClick={() => fileRef.current?.click()}>
            Import backup
          </Button>
          <input
            ref={fileRef}
            id={`${ids}-file`}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
      </SettingsRow>
      <SettingsRow
        label="Notes as Markdown"
        description="Your concept notes, saved Claude answers, and each problem's insight, summary and notes, grouped by subject and topic. Handy for reading or printing; import needs the backup file."
      >
        <Button icon={FileText} onClick={() => void onExportNotes()} disabled={busy}>
          Export notes
        </Button>
      </SettingsRow>
      <div className="px-4 py-4 sm:px-5">
        <Switch
          label="Remind me to back up"
          description="A gentle banner when your last backup is more than a week old."
          checked={profile.prefs.backupReminder}
          onChange={(backupReminder) => updatePrefs({ backupReminder })}
        />
      </div>
      <SettingsRow
        label="Start over"
        description="Delete everything and begin with a fresh profile."
      >
        <Button variant="secondary" onClick={() => setResetOpen(true)} className="text-danger">
          Reset all data
        </Button>
      </SettingsRow>
      <ImportDialog pending={pending} onClose={() => setPending(null)} services={services} />
      <ResetDialog open={resetOpen} onClose={() => setResetOpen(false)} services={services} />
    </SettingsSection>
  );
}
