// Settings shared by the two build targets:
//   vite.config.ts           -> GitHub Pages (normal multi-file build in dist/)
//   vite.artifact.config.ts  -> claude.ai artifact (one self-contained HTML file in dist-artifact/)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { Plugin, UserConfig } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

export type BuildTarget = "pages" | "artifact";

/** Writes `bundle-stats.json` next to the build output: the byte size of every bundled module.
 *  `scripts/check-artifact.mjs` prints the largest ones so growth stays visible. */
function bundleStats(outDir: string): Plugin {
  return {
    name: "atlas-bundle-stats",
    apply: "build",
    generateBundle(_options, bundle) {
      const modules: Record<string, number> = {};
      for (const item of Object.values(bundle)) {
        if (item.type !== "chunk") continue;
        for (const [id, info] of Object.entries(item.modules)) {
          modules[id] = (modules[id] ?? 0) + info.renderedLength;
        }
      }
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, "bundle-stats.json"), JSON.stringify({ modules }, null, 0));
    },
  };
}

/** KaTeX's stylesheet lists each math font three times (woff2, woff, ttf). Every browser Atlas
 *  supports reads woff2, so drop the other two formats: they would triple the inlined font size
 *  in the single-file artifact. */
function katexWoff2Only(): Plugin {
  return {
    name: "atlas-katex-woff2-only",
    enforce: "pre",
    transform(code, id) {
      if (!/katex(\.min)?\.css($|\?)/.test(id)) return null;
      return code.replace(
        /,\s*url\([^)]+\.woff\)\s*format\("woff"\)\s*,\s*url\([^)]+\.ttf\)\s*format\("truetype"\)/g,
        "",
      );
    },
  };
}

/** A few bundled libraries mention documentation URLs inside error messages. They are never
 *  fetched, but the artifact check rejects any URL it hasn't reviewed, so the build rewrites these
 *  exact strings into plain words instead of widening the check (CLAUDE.md decision 10). */
const LIBRARY_LINK_REWRITES: { module: RegExp; from: string; to: string }[] = [
  {
    module: /hast-util-to-jsx-runtime[\\/]/,
    from: "https://github.com/syntax-tree/hast-util-to-jsx-runtime",
    to: "the hast-util-to-jsx-runtime readme",
  },
  {
    module: /[\\/]redux[\\/]dist[\\/]/,
    from: "https://redux.js.org/Errors?code=",
    to: "the Redux error list, code ",
  },
  {
    module: /[\\/]@reduxjs[\\/]toolkit[\\/]dist[\\/]/,
    from: "https://redux-toolkit.js.org/Errors?code=",
    to: "the Redux Toolkit error list, code ",
  },
];

function rewriteLibraryLinks(): Plugin {
  return {
    name: "atlas-rewrite-library-links",
    enforce: "pre",
    transform(code, id) {
      let out = code;
      for (const rule of LIBRARY_LINK_REWRITES) {
        if (rule.module.test(id) && out.includes(rule.from))
          out = out.split(rule.from).join(rule.to);
      }
      return out === code ? null : out;
    },
  };
}

export function sharedConfig(target: BuildTarget, outDir: string): UserConfig {
  return {
    base: "./",
    plugins: [katexWoff2Only(), rewriteLibraryLinks(), react(), tailwindcss(), bundleStats(outDir)],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@fontsource-files": fileURLToPath(new URL("./node_modules/@fontsource", import.meta.url)),
      },
    },
    define: {
      __ARTIFACT__: JSON.stringify(target === "artifact"),
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    json: { stringify: true },
    build: {
      outDir,
      emptyOutDir: true,
      target: "es2022",
      sourcemap: false,
      reportCompressedSize: false,
    },
  };
}
