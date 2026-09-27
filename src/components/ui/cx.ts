// Joins class names, skipping falsy values, and resolves Tailwind conflicts so a className passed
// to a kit component wins over the component's own defaults: cx("p-3 text-muted", "p-4") → "p-4 text-muted".
import { extendTailwindMerge } from "tailwind-merge";

const merge = extendTailwindMerge({
  extend: {
    // Custom radius, shadow and font-size tokens (tokens.css and index.css, section 12.10).
    theme: {
      radius: ["control", "panel", "focal"],
      shadow: ["float", "focal", "pill"],
      text: ["page"],
    },
  },
});

export function cx(...parts: (string | false | null | undefined | 0)[]): string {
  return merge(parts.filter(Boolean).join(" "));
}
