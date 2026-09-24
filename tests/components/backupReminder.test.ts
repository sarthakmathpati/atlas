// F22: the gentle backup banner (older than 7 days, snoozed for 3 days).
import { describe, expect, it } from "vitest";
import { backupReminderDue, relativeDay } from "@/features/settings/backup";

const now = new Date("2026-09-24T12:00:00");
const profile = (over: Partial<Parameters<typeof backupReminderDue>[0]> = {}) => ({
  createdAt: "2026-09-01T00:00:00.000Z",
  prefs: { backupReminder: true },
  ...over,
});

describe("backup reminder", () => {
  it("shows when the last backup is more than a week old", () => {
    expect(backupReminderDue(profile({ lastBackupAt: "2026-09-10T00:00:00.000Z" }), now)).toBe(
      true,
    );
    expect(backupReminderDue(profile({ lastBackupAt: "2026-09-20T00:00:00.000Z" }), now)).toBe(
      false,
    );
  });

  it("counts from the first run when there has never been a backup", () => {
    expect(backupReminderDue(profile(), now)).toBe(true);
    expect(backupReminderDue(profile({ createdAt: "2026-09-22T00:00:00.000Z" }), now)).toBe(false);
  });

  it("stays hidden for 3 days after Not now, and when turned off", () => {
    expect(
      backupReminderDue(profile({ backupReminderDismissedAt: "2026-09-23T00:00:00.000Z" }), now),
    ).toBe(false);
    expect(
      backupReminderDue(profile({ backupReminderDismissedAt: "2026-09-20T00:00:00.000Z" }), now),
    ).toBe(true);
    expect(backupReminderDue(profile({ prefs: { backupReminder: false } }), now)).toBe(false);
  });
});

describe("relativeDay", () => {
  it("speaks in plain days", () => {
    expect(relativeDay("2026-09-24T01:00:00", now)).toBe("today");
    expect(relativeDay("2026-09-23T23:00:00", now)).toBe("yesterday");
    expect(relativeDay("2026-09-19T10:00:00", now)).toBe("5 days ago");
    expect(relativeDay("2026-06-01T10:00:00", now)).toMatch(/2026/);
  });
});
