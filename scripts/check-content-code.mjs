#!/usr/bin/env node
// Syntax-checks the code blocks in content/ (a writing aid for Phase 5, not part of `npm run check`).
//
//   npm run check:content-code              every subject
//   npm run check:content-code -- dsa oop   only these subjects
//
// C++ blocks (```cpp) are compiled with `g++ -std=c++20 -fsyntax-only`, each inside its own
// namespace with the usual headers, so snippets may reuse names. Python blocks (```python) are
// parsed with `ast.parse`. A block whose first line is `// sketch` or `# sketch` is skipped (for
// deliberately partial code). Needs g++ and python3; missing tools are reported and skipped.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CONTENT = join(ROOT, "content");

const PRELUDE = [
  "#include <bits/stdc++.h>",
  "#include <atomic>",
  "#include <thread>",
  "#include <mutex>",
  "#include <condition_variable>",
  "using namespace std;",
  "struct ListNode { int val; ListNode* next; ListNode(int v = 0, ListNode* n = nullptr) : val(v), next(n) {} };",
  "struct TreeNode { int val; TreeNode* left; TreeNode* right; TreeNode(int v = 0, TreeNode* l = nullptr, TreeNode* r = nullptr) : val(v), left(l), right(r) {} };",
  "",
].join("\n");

function has(cmd, args) {
  try {
    execFileSync(cmd, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Returns [{ lang, code, line, concept }] for every fenced block in a topic file. */
function blocksOf(text) {
  const lines = text.split("\n");
  const out = [];
  let concept = "";
  let cur = null;
  lines.forEach((line, i) => {
    const h = line.match(/^## ([a-z0-9.-]+)\s*$/);
    if (!cur && h) concept = h[1];
    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      if (cur) {
        out.push(cur);
        cur = null;
      } else cur = { lang: fence[1], code: [], line: i + 2, concept };
      return;
    }
    if (cur) cur.code.push(line);
  });
  return out.map((b) => ({ ...b, code: b.code.join("\n") }));
}

const skipped = (code) => /^\s*(\/\/|#) sketch\b/.test(code);

function checkCpp(blocks, tmp) {
  const failures = [];
  // One compile per block keeps error messages attributable; the prelude is precompiled.
  const header = join(tmp, "prelude.hpp");
  writeFileSync(header, PRELUDE);
  spawnSync("g++", ["-std=c++20", "-x", "c++-header", header, "-o", `${header}.gch`]);
  blocks.forEach((b, i) => {
    const body = b.code
      .split("\n")
      .filter((l) => !/^\s*#include\b/.test(l) && !/^\s*using namespace std;\s*$/.test(l))
      .join("\n");
    const hasMain = /\bint\s+main\s*\(/.test(body);
    const src = hasMain
      ? `#include "prelude.hpp"\n${body.replace(/\bint\s+main\s*\(/, "int block_main(")}\n`
      : `#include "prelude.hpp"\nnamespace block_${i} {\n${body}\n}\n`;
    const file = join(tmp, `b${i}.cpp`);
    writeFileSync(file, src);
    const r = spawnSync("g++", ["-std=c++20", "-fsyntax-only", "-Wall", "-Wno-unused", file], {
      cwd: tmp,
      encoding: "utf8",
    });
    const msg = `${r.stderr}`.trim();
    if (r.status !== 0) failures.push({ block: b, message: msg });
    else if (/warning:/.test(msg)) failures.push({ block: b, message: msg, warning: true });
  });
  return failures;
}

function checkPython(blocks) {
  const payload = JSON.stringify(blocks.map((b) => b.code));
  const script = [
    "import ast, json, sys",
    "blocks = json.load(sys.stdin)",
    "out = []",
    "for i, code in enumerate(blocks):",
    "    try:",
    "        ast.parse(code)",
    "    except SyntaxError as e:",
    "        out.append([i, f'line {e.lineno}: {e.msg}'])",
    "print(json.dumps(out))",
  ].join("\n");
  const r = spawnSync("python3", ["-c", script], { input: payload, encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout).map(([i, message]) => ({ block: blocks[i], message }));
}

function main() {
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const subjects = readdirSync(CONTENT).filter(
    (d) => statSync(join(CONTENT, d)).isDirectory() && (!wanted.length || wanted.includes(d)),
  );
  const cpp = [];
  const py = [];
  for (const s of subjects) {
    for (const f of readdirSync(join(CONTENT, s)).filter((f) => f.endsWith(".md"))) {
      const path = join(CONTENT, s, f);
      for (const b of blocksOf(readFileSync(path, "utf8"))) {
        const block = { ...b, file: relative(ROOT, path) };
        if (skipped(b.code)) continue;
        if (b.lang === "cpp") cpp.push(block);
        else if (b.lang === "python") py.push(block);
      }
    }
  }
  const tmp = mkdtempSync(join(tmpdir(), "atlas-code-"));
  let failures = [];
  try {
    if (has("g++", ["--version"])) failures.push(...checkCpp(cpp, tmp));
    else console.warn("! g++ not found; C++ blocks not checked");
    if (has("python3", ["--version"])) failures.push(...checkPython(py));
    else console.warn("! python3 not found; Python blocks not checked");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  for (const f of failures) {
    const { file, line, concept, lang } = f.block;
    console.log(`\n${f.warning ? "!" : "✗"} ${file}:${line} ${concept} (${lang})`);
    console.log(
      f.message
        .split("\n")
        .filter((l) => /error|warning/.test(l))
        .slice(0, 6)
        .map((l) => `    ${l.replace(/^.*?b\d+\.cpp:/, "")}`)
        .join("\n") || `    ${f.message}`,
    );
  }
  const errors = failures.filter((f) => !f.warning).length;
  console.log(
    `\n${errors ? "✗" : "✓"} ${cpp.length} C++ and ${py.length} Python blocks checked: ${errors} error(s), ${failures.length - errors} warning(s).`,
  );
  process.exit(errors ? 1 : 0);
}

main();
