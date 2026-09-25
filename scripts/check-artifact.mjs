#!/usr/bin/env node
// Checks the single-file artifact build (dist-artifact/index.html) against BUILD_SPEC.md section 2.5:
//   - the file must be at most 15 MB (warn above 12 MB)
//   - it must not contain http:// or https:// URLs, except:
//       * hosts a published artifact may load from (cdnjs, jsDelivr /npm/, Tailwind CDN, jQuery CDN, Google Fonts)
//       * claude.ai links shown as text, and leetcode.com problem links for the owner to open
//       * example.com, example.org and example.net (reserved for documentation) in concept text
//       * a short, reviewed list of text-only strings that bundled libraries contain
//         (XML namespace identifiers, React's error-decoder link, license comments). None of these
//         are ever requested; they are listed here so any NEW host fails the check and gets reviewed.
// It also prints the largest bundled modules and the syllabus and concept text sizes so growth
// stays visible.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const htmlPath = join(root, "dist-artifact", "index.html");
const statsPath = join(root, "dist-artifact", "bundle-stats.json");
const syllabusPath = join(root, "src", "data", "syllabus.generated.json");
const contentDir = join(root, "src", "data", "content");

const MB = 1024 * 1024;
const HARD_LIMIT = 15 * MB;
const SOFT_LIMIT = 12 * MB;

/** Hosts a published artifact page is allowed to reach (section 2.5). */
const NETWORK_ALLOWED = [
  { host: "cdnjs.cloudflare.com" },
  { host: "cdn.jsdelivr.net", pathPrefix: "/npm/" },
  { host: "cdn.tailwindcss.com" },
  { host: "code.jquery.com" },
  { host: "fonts.googleapis.com" },
  { host: "fonts.gstatic.com" },
];

/** Links the owner opens by hand (plain links are fine, section 2.5). */
const TEXT_LINKS = [
  { host: "claude.ai", why: "claude.ai links shown as text" },
  { host: "leetcode.com", why: "LeetCode problem links for the owner to open" },
  // Networking and web content needs example URLs (URL anatomy, CORS origins, redirects). These
  // domains are reserved for documentation (RFC 2606) and are only ever shown inside code.
  { host: "example.com", why: "reserved documentation domain in concept text" },
  { host: "example.org", why: "reserved documentation domain in concept text" },
  { host: "example.net", why: "reserved documentation domain in concept text" },
];

/** Strings inside bundled libraries that look like URLs but are never requested. Each entry is
 *  reviewed: prefer matching an exact URL over a whole host. */
const LIBRARY_TEXT = [
  { test: (u) => u.hostname === "www.w3.org", why: "XML/SVG/MathML namespace identifiers" },
  {
    test: (u) => u.hostname === "react.dev",
    why: "React's error-decoder link inside error messages",
  },
  { test: (u) => u.hostname === "tailwindcss.com", why: "Tailwind license comment" },
  {
    test: (u) => u.hostname === "json-schema.org" && u.pathname.startsWith("/draft"),
    why: "zod's JSON Schema `$schema` identifiers",
  },
  {
    test: (u) => u.href === "https://tinyurl.com/y2uuvskb" || u.href === "http://bit.ly/2kdckMn",
    why: "documentation links inside Dexie error messages",
  },
];

/** Code fragments that contain "http://" but are not URLs at all. */
const CODE_FRAGMENTS = [
  { text: "http://[${", why: "zod's IPv6 check builds a URL object locally; nothing is fetched" },
];

function fmt(bytes) {
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function classify(url) {
  const fragment = CODE_FRAGMENTS.find((f) => url.startsWith(f.text));
  if (fragment) return { ok: true, reason: fragment.why };
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "unparseable URL" };
  }
  const host = parsed.hostname.toLowerCase();
  for (const rule of NETWORK_ALLOWED) {
    if (host === rule.host && (!rule.pathPrefix || parsed.pathname.startsWith(rule.pathPrefix))) {
      return { ok: true, reason: "allowed network host" };
    }
  }
  for (const rule of TEXT_LINKS) {
    if (host === rule.host || host.endsWith(`.${rule.host}`)) return { ok: true, reason: rule.why };
  }
  for (const rule of LIBRARY_TEXT) {
    if (rule.test(parsed)) return { ok: true, reason: rule.why };
  }
  return { ok: false, reason: `host "${host}" is not allowed` };
}

function main() {
  if (!existsSync(htmlPath)) {
    console.error(
      `✗ ${relative(root, htmlPath)} is missing. Run \`npm run build:artifact\` first.`,
    );
    process.exit(1);
  }

  const html = readFileSync(htmlPath, "utf8");
  const size = statSync(htmlPath).size;
  const problems = [];

  console.log(`Artifact file: ${relative(root, htmlPath)} (${fmt(size)})`);
  if (size > HARD_LIMIT) problems.push(`File is ${fmt(size)}, over the 15 MB limit.`);
  else if (size > SOFT_LIMIT)
    console.warn(`! Size ${fmt(size)} is over the 12 MB target (limit 15 MB).`);

  // Every script and style must be inline: no external <script src> or <link rel=stylesheet href>.
  const externalScript = html.match(/<script[^>]+src=["'](?!data:)[^"']+["']/i);
  if (externalScript) problems.push(`External script reference found: ${externalScript[0]}`);
  const externalStyle = html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/i);
  if (externalStyle) problems.push(`External stylesheet found: ${externalStyle[0]}`);

  const urlPattern = /https?:\/\/[^\s"'`<>()\\]+/g;
  const byHost = new Map();
  for (const match of html.matchAll(urlPattern)) {
    const url = match[0].replace(/[.,;:]+$/, "");
    const verdict = classify(url);
    let host = "(code fragment)";
    try {
      host = new URL(url).hostname;
    } catch {
      /* keep the placeholder */
    }
    const entry = byHost.get(host) ?? { count: 0, verdict, example: url };
    entry.count += 1;
    byHost.set(host, entry);
    if (!verdict.ok && entry.count === 1)
      problems.push(`Disallowed URL: ${url} (${verdict.reason})`);
  }

  if (byHost.size > 0) {
    console.log("\nURLs found in the file:");
    for (const [host, { count, verdict }] of [...byHost].sort((a, b) => b[1].count - a[1].count)) {
      console.log(
        `  ${verdict.ok ? "ok " : "BAD"} ${host.padEnd(24)} ×${String(count).padEnd(4)} ${verdict.reason}`,
      );
    }
  }

  if (existsSync(statsPath)) {
    const { modules } = JSON.parse(readFileSync(statsPath, "utf8"));
    const grouped = new Map();
    for (const [id, bytes] of Object.entries(modules)) {
      const clean = id.replace(/\?.*$/, "");
      const nm = clean.lastIndexOf("node_modules/");
      let key;
      if (nm >= 0) {
        const parts = clean.slice(nm + "node_modules/".length).split("/");
        key = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
      } else {
        key = relative(root, clean) || clean;
      }
      grouped.set(key, (grouped.get(key) ?? 0) + bytes);
    }
    const top = [...grouped].sort((a, b) => b[1] - a[1]).slice(0, 15);
    console.log("\nLargest bundled modules (source size before minification):");
    for (const [key, bytes] of top) console.log(`  ${fmt(bytes).padStart(10)}  ${key}`);
  }

  if (existsSync(syllabusPath)) {
    console.log(`\nSyllabus JSON: ${fmt(statSync(syllabusPath).size)} (structure)`);
  }
  if (existsSync(contentDir)) {
    const files = readdirSync(contentDir).filter((f) => f.endsWith(".generated.json"));
    const total = files.reduce((n, f) => n + statSync(join(contentDir, f)).size, 0);
    console.log(`Concept text: ${fmt(total)} in ${files.length} subject files`);
  }

  if (problems.length > 0) {
    console.error("\n✗ Artifact check failed:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log("\n✓ Artifact check passed.");
}

main();
