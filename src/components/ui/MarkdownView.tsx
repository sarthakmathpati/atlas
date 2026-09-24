// MarkdownView (section 12.7): concept content, notes and Claude answers. GitHub-flavored
// Markdown, KaTeX math ($…$ and $$…$$) and highlighted code blocks. Raw HTML is never rendered.
import "katex/dist/katex.min.css";
import type { Element, Text } from "hast";
import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CodeView } from "./code/CodeView";
import { cx } from "./cx";
import { normalizeDisplayMath } from "./markdown";

function textOf(node: Element | Text): string {
  if (node.type === "text") return node.value;
  return node.children
    .map((c) => (c.type === "text" || c.type === "element" ? textOf(c) : ""))
    .join("");
}

const components: Components = {
  pre({ node }) {
    const code = node?.children.find(
      (c): c is Element => c.type === "element" && c.tagName === "code",
    );
    if (!code) return null;
    const classes = code.properties.className;
    const list = Array.isArray(classes) ? classes.map(String) : [];
    const lang = list.find((c) => c.startsWith("language-"))?.slice("language-".length);
    return <CodeView code={textOf(code)} language={lang} className="not-prose" />;
  },
  table({ node: _node, ...props }: ComponentPropsWithoutRef<"table"> & { node?: unknown }) {
    return (
      <div className="atlas-table-wrap" tabIndex={0} role="region" aria-label="Table">
        <table {...props} />
      </div>
    );
  },
  a({ node: _node, href, children, ...props }) {
    const external = href ? /^https?:/.test(href) : false;
    return (
      <a
        href={href}
        {...props}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
  img({ node: _node, alt }) {
    // Remote images can't load inside the artifact; show the description instead.
    return <span className="text-muted">[{alt || "image"}]</span>;
  },
};

interface MarkdownViewProps {
  children: string;
  className?: string;
  /** Smaller text for panels and chat answers (14 px instead of 16 px). */
  compact?: boolean;
}

export default function MarkdownView({ children, className, compact }: MarkdownViewProps) {
  return (
    <div className={cx("atlas-prose", compact && "text-[14px]", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
        components={components}
      >
        {normalizeDisplayMath(children)}
      </ReactMarkdown>
    </div>
  );
}
