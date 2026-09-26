// Markdown helpers shared by MarkdownView and tests.

/** Content often writes display math on one line (`$$x^2$$`); remark-math only treats `$$` as a
 *  block when the fences are on their own lines, so split such lines (outside code fences). */
export function normalizeDisplayMath(markdown: string): string {
  let inFence = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
      if (inFence) return line;
      const m = /^(\s*)\$\$(.+?)\$\$\s*$/.exec(line);
      return m ? `${m[1]}$$\n${m[1]}${m[2]!.trim()}\n${m[1]}$$` : line;
    })
    .join("\n");
}

/** The concept id of an in-app concept link (`#/concept/<id>`) in content, or undefined. */
export function conceptLinkId(href: string | undefined): string | undefined {
  const m = href?.match(/^#\/concept\/([^?#/]+)$/);
  return m ? decodeURIComponent(m[1]!) : undefined;
}
