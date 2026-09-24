/** Joins class names, skipping falsy values: cx("a", on && "b"). */
export function cx(...parts: (string | false | null | undefined | 0)[]): string {
  return parts.filter(Boolean).join(" ");
}
