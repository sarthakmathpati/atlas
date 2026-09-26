// Tolerant JSON reading for Claude's replies (BUILD_SPEC.md 10.1), used by API and copy-prompt
// modes, and to validate what built-in Claude's `sample.json` returns. The order matches the
// runtime's own parser: the whole text; else the body of the first fenced code block; else the
// text from the first `{` or `[` to the last `}` or `]`. Every value is then checked with zod.
import type { ZodType } from "zod";

export type JsonExtract = { ok: true; value: unknown } | { ok: false };

function tryParse(text: string): JsonExtract {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown };
  } catch {
    return { ok: false };
  }
}

/** Finds one JSON value in a reply, or reports that there is none. */
export function extractJson(text: string): JsonExtract {
  const whole = tryParse(text);
  if (whole.ok) return whole;
  const fence = /```[a-zA-Z0-9_-]*[ \t]*\r?\n([\s\S]*?)```/.exec(text);
  if (fence) {
    const inner = tryParse(fence[1] ?? "");
    if (inner.ok) return inner;
  }
  const starts = [text.indexOf("{"), text.indexOf("[")].filter((i) => i >= 0);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (starts.length > 0 && end > Math.min(...starts)) {
    const slice = tryParse(text.slice(Math.min(...starts), end + 1));
    if (slice.ok) return slice;
  }
  return { ok: false };
}

export type Validated<T> =
  { ok: true; data: T } | { ok: false; reason: "no_json" | "shape"; issues: string[] };

function issuesOf(error: { issues: { path: PropertyKey[]; message: string }[] }): string[] {
  return error.issues
    .slice(0, 6)
    .map((i) => (i.path.length ? `${i.path.map(String).join(".")}: ${i.message}` : i.message));
}

/**
 * Checks a parsed value against a schema. A common near-miss is accepted too: an object with a
 * single array property when the schema wants that array (`{"questions": [...]}` for a quiz).
 */
export function validateJson<T>(schema: ZodType<T>, value: unknown): Validated<T> {
  const first = schema.safeParse(value);
  if (first.success) return { ok: true, data: first.data };
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.values(value as Record<string, unknown>);
    if (entries.length === 1 && Array.isArray(entries[0])) {
      const inner = schema.safeParse(entries[0]);
      if (inner.success) return { ok: true, data: inner.data };
    }
  }
  return { ok: false, reason: "shape", issues: issuesOf(first.error) };
}

/** Reads and validates a reply in one step. */
export function parseReply<T>(text: string, schema: ZodType<T>): Validated<T> {
  const found = extractJson(text);
  if (!found.ok) return { ok: false, reason: "no_json", issues: [] };
  return validateJson(schema, found.value);
}

/** The shape instruction appended to JSON tasks: "Reply with only JSON matching this shape". */
export function jsonInstruction(shape: string): string {
  return [
    "Reply with only JSON matching this shape, with no other text before or after it:",
    shape.trim(),
  ].join("\n");
}

/** Added to the instructions when the first reply could not be read (one retry, never a loop). */
export const JSON_RETRY_REMINDER =
  "Important: your previous reply could not be read as the JSON described above. Reply with only that JSON value: no Markdown fences, no comments, and no text before or after it.";
