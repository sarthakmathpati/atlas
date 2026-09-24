// Starter templates for the editor (F7): a generic skeleton per language. The app doesn't know
// LeetCode's exact function signatures, so these are only the scaffolding.
import type { CodeLanguage } from "@/components/ui/code/languages";

export const STARTER_TEMPLATES: Record<CodeLanguage, string> = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

class Solution {
public:

};
`,
  java: `import java.util.*;

class Solution {

}
`,
  python: `from typing import List, Optional


class Solution:
    def solve(self):
        pass
`,
  javascript: `/**
 * @param {*} input
 * @return {*}
 */
var solve = function (input) {

};
`,
  typescript: `function solve(input: unknown): unknown {

}
`,
  sql: `-- MySQL
SELECT

FROM
    ;
`,
  text: `Idea:

Steps:

Answer:
`,
};

export function starterTemplate(language: CodeLanguage): string {
  return STARTER_TEMPLATES[language] ?? "";
}

/** True when the editor holds nothing of the owner's own (empty or an untouched template). */
export function isBlankCode(code: string, language: CodeLanguage): boolean {
  const trimmed = code.trim();
  return trimmed === "" || trimmed === starterTemplate(language).trim();
}

const TEMPLATE_KEY = "atlas.template";

/** Whether new attempts start from the template (a per-browser convenience). */
export function readTemplatePref(): boolean {
  try {
    return localStorage.getItem(TEMPLATE_KEY) === "on";
  } catch {
    return false;
  }
}

export function writeTemplatePref(on: boolean): void {
  try {
    localStorage.setItem(TEMPLATE_KEY, on ? "on" : "off");
  } catch {
    /* only a convenience */
  }
}
