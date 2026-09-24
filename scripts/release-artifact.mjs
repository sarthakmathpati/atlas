#!/usr/bin/env node
// Zips dist-artifact/index.html into release/atlas-artifact.zip (BUILD_SPEC.md section 2.2).
// A zip is used because a large HTML file uploaded straight into a claude.ai chat is read as text.
// The zip entry gets a fixed timestamp so rebuilding identical HTML produces an identical zip.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const root = fileURLToPath(new URL("..", import.meta.url));
const htmlPath = join(root, "dist-artifact", "index.html");
const outDir = join(root, "release");
const outPath = join(outDir, "atlas-artifact.zip");

if (!existsSync(htmlPath)) {
  console.error("✗ dist-artifact/index.html is missing. Run `npm run build:artifact` first.");
  process.exit(1);
}

const html = readFileSync(htmlPath);
const zipped = zipSync(
  { "index.html": [html, { mtime: new Date("2025-01-01T00:00:00Z"), level: 9 }] },
  { level: 9 },
);
mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, zipped);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(
  `✓ Wrote ${relative(root, outPath)} (${kb(zipped.length)}, from ${kb(html.length)} of HTML).`,
);
