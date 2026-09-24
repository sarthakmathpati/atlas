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

export function sharedConfig(target: BuildTarget, outDir: string): UserConfig {
  return {
    base: "./",
    plugins: [react(), tailwindcss(), bundleStats(outDir)],
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
