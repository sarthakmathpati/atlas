// Matches mistake tag labels Claude suggests (F12) to the owner's tags: case, spacing and
// punctuation are ignored, and archived tags are left out.
import type { MistakeTag } from "@/lib/types";

/** Maps the review's tag labels to the owner's live tags (case and spacing ignored). */
export function matchTags(
  labels: readonly string[],
  tags: Readonly<Record<string, MistakeTag>>,
): { label: string; tag: MistakeTag | undefined }[] {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const byLabel = new Map(
    Object.values(tags)
      .filter((t) => !t.archived)
      .map((t) => [norm(t.label), t]),
  );
  return labels.map((label) => ({ label, tag: byLabel.get(norm(label)) }));
}
