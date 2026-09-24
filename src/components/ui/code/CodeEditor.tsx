// CodeEditor (section 12.7, F7): CodeMirror 6 through @uiw/react-codemirror, with line numbers,
// bracket matching, auto-indent and the app's own colors (the same `tok-*` classes as CodeView,
// so both themes work without swapping editor themes). Loaded lazily; it is the heaviest widget.
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { MySQL, sql } from "@codemirror/lang-sql";
import { syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView, placeholder as placeholderExt } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo, useRef } from "react";
import { cx } from "../cx";
import type { CodeLanguage } from "./languages";

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: CodeLanguage;
  /** Accessible name, for example "Code for Two Sum". */
  label: string;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: string;
  height?: string;
  className?: string;
  /** Called on the first change after mounting (starts the attempt timer, F7). */
  onFirstEdit?: () => void;
}

function languageExtension(lang: CodeLanguage): Extension[] {
  switch (lang) {
    case "cpp":
      return [cpp()];
    case "java":
      return [java()];
    case "python":
      return [python()];
    case "javascript":
      return [javascript()];
    case "typescript":
      return [javascript({ typescript: true })];
    case "sql":
      return [sql({ dialect: MySQL })];
    default:
      return [];
  }
}

// Every color is a design token, so the editor follows the light and dark themes by itself.
const atlasTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--code-bg)",
    color: "var(--text)",
    fontSize: "13.5px",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6" },
  ".cm-content": { caretColor: "var(--accent)", padding: "10px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)", borderLeftWidth: "2px" },
  ".cm-gutters": {
    backgroundColor: "var(--code-bg)",
    color: "var(--code-gutter)",
    borderRight: "1px solid var(--rule)",
  },
  ".cm-activeLine": { backgroundColor: "var(--code-active-line)" },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--code-active-line)",
    color: "var(--text-muted)",
  },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    { backgroundColor: "var(--code-selection) !important" },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "var(--accent-soft)",
    outline: "1px solid var(--rule-strong)",
  },
  ".cm-nonmatchingBracket, &.cm-focused .cm-nonmatchingBracket": {
    backgroundColor: "var(--danger-soft)",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--surface-sunken)",
    border: "1px solid var(--rule)",
    color: "var(--text-muted)",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--surface-raised)",
    border: "1px solid var(--rule)",
    borderRadius: "var(--radius-control)",
    boxShadow: "var(--shadow-float)",
    color: "var(--text)",
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "var(--accent-soft)",
    color: "var(--text)",
  },
  ".cm-panels": { backgroundColor: "var(--surface)", color: "var(--text)" },
  ".cm-placeholder": { color: "var(--text-faint)" },
  ".cm-searchMatch": { backgroundColor: "var(--warning-soft)" },
});

export default function CodeEditor({
  value,
  onChange,
  language,
  label,
  readOnly,
  placeholder,
  minHeight = "240px",
  height,
  className,
  onFirstEdit,
}: CodeEditorProps) {
  const edited = useRef(false);
  const extensions = useMemo(() => {
    const list: Extension[] = [
      ...languageExtension(language),
      syntaxHighlighting(classHighlighter),
      EditorView.contentAttributes.of({ "aria-label": label }),
    ];
    if (placeholder) list.push(placeholderExt(placeholder));
    return list;
  }, [language, label, placeholder]);

  return (
    <div
      className={cx(
        "overflow-hidden rounded-control border border-rule focus-within:border-accent",
        className,
      )}
    >
      <CodeMirror
        value={value}
        onChange={(next) => {
          if (!edited.current) {
            edited.current = true;
            onFirstEdit?.();
          }
          onChange(next);
        }}
        theme={atlasTheme}
        extensions={extensions}
        readOnly={readOnly}
        editable={!readOnly}
        height={height}
        minHeight={minHeight}
        indentWithTab
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: !readOnly,
          indentOnInput: true,
          tabSize: 4,
          searchKeymap: true,
        }}
      />
    </div>
  );
}
