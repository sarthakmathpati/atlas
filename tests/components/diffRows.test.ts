// F7 attempt comparison: side-by-side rows, folding and word marks.
import { describe, expect, it } from "vitest";
import { applyMarks, diffRows, foldRows } from "@/components/ui/code/diffRows";

describe("diffRows", () => {
  it("pairs changed lines and numbers both sides", () => {
    const rows = diffRows("a\nb\nc\n", "a\nB\nc\nd\n");
    expect(rows.map((r) => r.kind)).toEqual(["same", "change", "same", "add"]);
    const change = rows[1]!;
    if (change.kind !== "change") throw new Error("expected a change");
    expect(change.left).toMatchObject({ n: 2, text: "b" });
    expect(change.right).toMatchObject({ n: 2, text: "B" });
    const add = rows[3]!;
    if (add.kind !== "add") throw new Error("expected an add");
    expect(add.right.n).toBe(4);
  });

  it("marks only the words that changed", () => {
    const rows = diffRows("int a = 1;\n", "int b = 1;\n");
    const row = rows[0]!;
    if (row.kind !== "change") throw new Error("expected a change");
    expect(row.left.marks).toEqual([[4, 5]]);
    expect(row.right.marks).toEqual([[4, 5]]);
  });

  it("handles more removed than added lines", () => {
    const rows = diffRows("x\ny\nz\n", "X\n");
    expect(rows.map((r) => r.kind)).toEqual(["change", "del", "del"]);
  });

  it("treats identical input as all unchanged and handles empty code", () => {
    expect(diffRows("a\nb", "a\nb").every((r) => r.kind === "same")).toBe(true);
    expect(diffRows("", "")).toEqual([]);
    expect(diffRows("", "x\n").map((r) => r.kind)).toEqual(["add"]);
  });
});

describe("foldRows", () => {
  it("folds long unchanged runs but keeps context around changes", () => {
    const before = Array.from({ length: 20 }, (_, i) => `line ${i}`).join("\n");
    const after = before.replace("line 10", "LINE 10");
    const folded = foldRows(diffRows(before, after), 3);
    const kinds = folded.map((r) => r.kind);
    expect(kinds.filter((k) => k === "gap")).toHaveLength(2);
    const firstGap = folded[0]!;
    expect(firstGap.kind).toBe("gap");
    if (firstGap.kind === "gap") expect(firstGap.hidden).toBe(7);
    expect(folded.find((r) => r.kind === "change")).toBeDefined();
  });

  it("keeps short runs as they are", () => {
    const rows = diffRows("a\nb\nc\n", "a\nB\nc\n");
    expect(foldRows(rows)).toEqual(rows);
  });
});

describe("applyMarks", () => {
  it("splits tokens at mark boundaries", () => {
    const out = applyMarks(
      [
        { text: "int", className: "tok-keyword" },
        { text: " x = 1;", className: "" },
      ],
      [[1, 5]],
    );
    expect(out.map((t) => [t.text, t.marked, t.className])).toEqual([
      ["i", false, "tok-keyword"],
      ["nt", true, "tok-keyword"],
      [" x", true, ""],
      [" = 1;", false, ""],
    ]);
  });
});
