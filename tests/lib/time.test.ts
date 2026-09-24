import { describe, expect, it } from "vitest";
import { addDaysToDate, daysBetween, localDate, localMonth, parseLocalDate } from "@/lib/time";

describe("local dates", () => {
  it("formats the local calendar date and month", () => {
    const d = new Date(2026, 0, 5, 23, 59); // 5 Jan 2026, 23:59 local time
    expect(localDate(d)).toBe("2026-01-05");
    expect(localMonth(d)).toBe("2026-01");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDaysToDate("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDaysToDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysToDate("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("counts calendar days, not 24-hour periods", () => {
    expect(daysBetween("2026-09-01", "2026-09-24")).toBe(23);
    expect(daysBetween("2026-09-24", "2026-09-01")).toBe(-23);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2); // across a daylight saving change in many zones
  });

  it("parses yyyy-mm-dd as local midnight", () => {
    const d = parseLocalDate("2026-09-24");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 8, 24, 0]);
  });
});
