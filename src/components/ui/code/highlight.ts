// Static syntax highlighting with the same lezer parsers and classes the editor uses, so code in
// notes, content and attempt history looks exactly like code in the editor.
import { classHighlighter, highlightCode } from "@lezer/highlight";
import { parserFor, type CodeLanguage } from "./languages";

export interface Token {
  text: string;
  /** Space-separated `tok-*` classes (see components.css), empty for plain text. */
  className: string;
}

/** Splits code into lines of highlighted tokens. */
export function highlightLines(code: string, lang: CodeLanguage): Token[][] {
  const source = code.replace(/\r\n?/g, "\n");
  const language = parserFor(lang);
  if (!language) return source.split("\n").map((line) => [{ text: line, className: "" }]);
  const lines: Token[][] = [[]];
  try {
    const tree = language.parser.parse(source);
    highlightCode(
      source,
      tree,
      classHighlighter,
      (text, classes) => lines[lines.length - 1]!.push({ text, className: classes }),
      () => lines.push([]),
    );
  } catch {
    return source.split("\n").map((line) => [{ text: line, className: "" }]);
  }
  return lines;
}
