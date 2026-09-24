// The concept id slug rule (CLAUDE.md "Decisions" 2), shared with scripts/lib/spec.mjs.
// Lowercase; apostrophes dropped; "++" → "pp", "+" → "plus", "*" → "star"; every other run of
// non-alphanumeric characters becomes one hyphen.
export function slugifyConceptName(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/\+\+/g, "pp")
    .replace(/\+/g, " plus ")
    .replace(/\*/g, " star ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
