// Reads the design tokens straight from the CSS files, so the tests check what ships:
// src/styles/tokens.css and src/styles/subjects.generated.css. Returns every custom property
// per theme (Day is the base; Dusk and Night override it), plus the at-rule each rule sits in.
import { readFileSync } from "node:fs";

export type ThemeName = "day" | "dusk" | "night";

export interface CssRule {
  selector: string;
  /** Enclosing at-rules, outermost first (for example ["@media not print"]). */
  atRules: string[];
  declarations: Record<string, string>;
}

export const TOKEN_FILES = [
  "../../src/styles/tokens.css",
  "../../src/styles/subjects.generated.css",
];

/** A small CSS reader: enough for flat token files (rules, nested at-rules, no strings with braces). */
export function parseRules(css: string): CssRule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: CssRule[] = [];
  const stack: string[] = [];
  let buffer = "";
  for (const ch of text) {
    if (ch === "{") {
      stack.push(buffer.trim());
      buffer = "";
    } else if (ch === "}") {
      const head = stack.pop() ?? "";
      if (!head.startsWith("@")) {
        const declarations: Record<string, string> = {};
        for (const part of buffer.split(";")) {
          const i = part.indexOf(":");
          if (i < 0) continue;
          declarations[part.slice(0, i).trim()] = part.slice(i + 1).trim();
        }
        rules.push({ selector: head.replace(/\s+/g, " "), atRules: [...stack], declarations });
      }
      buffer = "";
    } else {
      buffer += ch;
    }
  }
  return rules;
}

export function tokenRules(files: string[] = TOKEN_FILES): CssRule[] {
  return files.flatMap((file) => parseRules(readFileSync(new URL(file, import.meta.url), "utf8")));
}

/** Which theme a rule defines tokens for, or null for rules that aren't theme blocks. */
export function ruleTheme(rule: CssRule): ThemeName | "shared" | null {
  const selectors = rule.selector.split(",").map((s) => s.trim());
  const has = (name: ThemeName) =>
    selectors.some(
      (s) => s === `:root[data-theme="${name}"]` || s === `[data-theme-preview="${name}"]`,
    );
  if (has("dusk") && has("night")) return "shared";
  if (has("dusk")) return "dusk";
  if (has("night")) return "night";
  if (selectors.includes(":root") || has("day")) return "day";
  return null;
}

/**
 * Every custom property per theme, resolved the way the cascade does on screen: Day's rules
 * (`:root`) first, then Dusk's or Night's, whose selectors are more specific and always win.
 */
export function themeTokens(): Record<ThemeName, Record<string, string>> {
  const rules = tokenRules().filter((r) => !r.atRules.includes("@media print"));
  const varsOf = (rule: CssRule) =>
    Object.fromEntries(Object.entries(rule.declarations).filter(([k]) => k.startsWith("--")));
  const day: Record<string, string> = {};
  for (const rule of rules) if (ruleTheme(rule) === "day") Object.assign(day, varsOf(rule));
  const out: Record<ThemeName, Record<string, string>> = {
    day,
    dusk: { ...day },
    night: { ...day },
  };
  for (const rule of rules) {
    const theme = ruleTheme(rule);
    if (theme === "dusk" || theme === "shared") Object.assign(out.dusk, varsOf(rule));
    if (theme === "night" || theme === "shared") Object.assign(out.night, varsOf(rule));
  }
  return out;
}
