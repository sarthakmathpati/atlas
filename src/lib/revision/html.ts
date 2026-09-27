// "Export as HTML" (F19): the sheet as rendered on screen, wrapped in a standalone page with its
// own light styles, so it prints well from any browser (the fallback when printing is blocked in
// the claude.ai frame, section 2.5). Math shows through the MathML KaTeX writes next to its HTML,
// so no fonts or scripts are needed; code keeps its highlighting colors.

const STYLE = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { margin: 0; background: #fff; color: #0e2233;
  font: 15px/1.55 "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 820px; margin: 0 auto; padding: 32px 24px 48px; }
h1 { font-size: 26px; margin: 0 0 4px; }
h2 { font-size: 20px; margin: 28px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #d3dee8; }
h3 { font-size: 17px; margin: 20px 0 8px; }
h4 { font-size: 15px; margin: 16px 0 6px; }
h1, h2, h3, h4 { line-height: 1.25; font-weight: 600; break-after: avoid; }
p { margin: 6px 0; }
ul, ol { margin: 6px 0; padding-left: 22px; }
li { margin: 3px 0; break-inside: avoid; }
li:has(> input[type=checkbox]) { list-style: none; margin-left: -20px; }
input[type=checkbox] { margin-right: 6px; }
em { color: #4e6477; }
.meta { color: #4e6477; margin: 0 0 16px; }
.claude-note { border: 1px solid #d3dee8; border-radius: 8px; padding: 8px 12px; color: #4e6477; }
code { font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; }
:not(pre) > code { background: #eef2f6; border-radius: 4px; padding: 1px 4px; }
pre { background: #f6f8fb; border: 1px solid #e2e9f0; border-radius: 8px; padding: 10px 12px;
  white-space: pre-wrap; word-break: break-word; break-inside: avoid; font-size: 12.5px; line-height: 1.45; }
table { border-collapse: collapse; margin: 8px 0; font-size: 14px; }
th, td { border: 1px solid #d3dee8; padding: 4px 8px; text-align: left; }
.katex-html { display: none; }
.katex-mathml math { font-size: 1.05em; }
.katex-display { margin: 8px 0; overflow-x: auto; }
.sheet-page-break { break-before: page; }
.tok-keyword { color: #7b3fb0; } .tok-string, .tok-string2 { color: #17735a; }
.tok-number, .tok-bool, .tok-atom { color: #9a4d00; } .tok-comment { color: #5a6f82; font-style: italic; }
.tok-variableName.tok-definition, .tok-propertyName.tok-definition { color: #1560a0; }
.tok-typeName, .tok-className { color: #8a3a8a; } .tok-meta { color: #9a4d00; }
.tok-operator, .tok-punctuation { color: #33495c; }
@page { margin: 14mm 12mm; }
@media print { main { padding: 0; max-width: none; } a { color: inherit; text-decoration: none; } }
`;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A complete HTML document around the sheet's rendered body (the on-screen HTML). */
export function sheetHtml(opts: {
  title: string;
  dateLabel: string;
  bodyHtml: string;
  /** A line under the title, such as "Tightened by Claude. Your original is in Atlas." */
  note?: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(`${opts.title}, ${opts.dateLabel}`)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<h1>${escapeHtml(opts.title)}</h1>
<p class="meta">${escapeHtml(opts.dateLabel)}. Made by Atlas from your own progress.</p>
${opts.note ? `<p class="claude-note">${escapeHtml(opts.note)}</p>\n` : ""}${opts.bodyHtml}
</main>
</body>
</html>
`;
}

/**
 * The HTML of a rendered sheet, cleaned for a file: no buttons (such as Copy on code), no ids or
 * inline event handlers, no hidden screen-reader duplicates.
 */
export function cleanRenderedHtml(root: Element): string {
  const copy = root.cloneNode(true) as Element;
  copy.querySelectorAll("button, [data-export-skip], .sr-only").forEach((el) => el.remove());
  copy.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      if (
        attr.name === "id" ||
        attr.name.startsWith("on") ||
        attr.name.startsWith("aria-") ||
        attr.name === "tabindex" ||
        attr.name === "role"
      )
        el.removeAttribute(attr.name);
    }
  });
  return copy.innerHTML;
}
