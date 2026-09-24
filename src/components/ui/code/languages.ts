// Languages for code (editor and static highlighting). C++, Java, Python, JavaScript and SQL are
// the editor's languages (F7); TypeScript is accepted for Markdown code blocks.
import { cppLanguage } from "@codemirror/lang-cpp";
import { javaLanguage } from "@codemirror/lang-java";
import { javascriptLanguage, typescriptLanguage } from "@codemirror/lang-javascript";
import { pythonLanguage } from "@codemirror/lang-python";
import { MySQL } from "@codemirror/lang-sql";
import type { Language } from "@codemirror/language";

export type CodeLanguage = "cpp" | "java" | "python" | "javascript" | "typescript" | "sql" | "text";

export const CODE_LANGUAGE_LABEL: Record<CodeLanguage, string> = {
  cpp: "C++",
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  sql: "SQL",
  text: "Plain text",
};

/** The languages offered in the editor's picker, in this order. */
export const EDITOR_LANGUAGES: CodeLanguage[] = [
  "cpp",
  "java",
  "python",
  "javascript",
  "sql",
  "text",
];

const ALIASES: Record<string, CodeLanguage> = {
  cpp: "cpp",
  "c++": "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  h: "cpp",
  c: "cpp",
  java: "java",
  python: "python",
  python3: "python",
  py: "python",
  javascript: "javascript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  typescript: "typescript",
  ts: "typescript",
  tsx: "typescript",
  sql: "sql",
  mysql: "sql",
  postgresql: "sql",
  text: "text",
  txt: "text",
  plaintext: "text",
};

/** Maps a fenced-code tag or stored language ("c++", "py", …) to a known language. */
export function normalizeLanguage(lang: string | null | undefined): CodeLanguage {
  if (!lang) return "text";
  return ALIASES[lang.trim().toLowerCase()] ?? "text";
}

/** The lezer language used for static highlighting (null for plain text). */
export function parserFor(lang: CodeLanguage): Language | null {
  switch (lang) {
    case "cpp":
      return cppLanguage;
    case "java":
      return javaLanguage;
    case "python":
      return pythonLanguage;
    case "javascript":
      return javascriptLanguage;
    case "typescript":
      return typescriptLanguage;
    case "sql":
      return MySQL.language;
    default:
      return null;
  }
}
