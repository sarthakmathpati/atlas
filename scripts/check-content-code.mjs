#!/usr/bin/env node
// Syntax-checks the code blocks in content/ (a writing aid for Phase 5, not part of `npm run check`).
//
//   npm run check:content-code              every subject
//   npm run check:content-code -- dsa oop   only these subjects
//
// C++ blocks (```cpp) are compiled with `g++ -std=c++20 -fsyntax-only`, each inside its own
// namespace with the usual headers (plus POSIX and Linux ones such as unistd.h, sys/epoll.h and
// netinet/in.h, so C++ checks need Linux), so snippets may reuse names. Python blocks (```python) are
// parsed with `ast.parse`. Java blocks (```java) are compiled with one `javac` run, each block in
// its own package with the common java.util imports; top-level `public` is dropped so a block may
// hold several classes, and a block without a top-level type is wrapped in a class. A block whose
// first line is `// sketch` or `# sketch` is skipped (for deliberately partial code). A C++ block whose
// first line starts with `// Undefined behavior` or `// Warns` shows a bug or a compiler warning on
// purpose: it must still compile, but its warnings are expected and not reported. Needs g++,
// python3 and javac; missing tools are reported and skipped.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
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
  "#include <coroutine>", // bits/stdc++.h leaves it out in g++ 13 (conc.patterns event loop)
  "#include <immintrin.h>", // x86 SIMD intrinsics (arch.performance), used with [[gnu::target]]
  // GCC's policy-based tree, for the order-statistics set in lang.cpp-stl.
  "#include <ext/pb_ds/assoc_container.hpp>",
  "#include <ext/pb_ds/tree_policy.hpp>",
  // POSIX headers for the OS and CN subjects (fork, pipes, mmap, semaphores, sockets, epoll,
  // uname, user-level context switches, addresses and name lookup).
  "#include <arpa/inet.h>",
  "#include <fcntl.h>",
  "#include <ifaddrs.h>",
  "#include <net/if.h>",
  "#include <netdb.h>",
  "#include <netinet/in.h>",
  "#include <netinet/ip_icmp.h>",
  "#include <netinet/tcp.h>",
  "#include <poll.h>",
  "#include <pthread.h>",
  "#include <semaphore.h>",
  "#include <signal.h>",
  "#include <sys/epoll.h>",
  "#include <sys/mman.h>",
  "#include <sys/random.h>",
  "#include <sys/resource.h>",
  "#include <sys/socket.h>",
  "#include <sys/stat.h>",
  "#include <sys/syscall.h>",
  "#include <sys/types.h>",
  "#include <sys/uio.h>",
  "#include <sys/utsname.h>",
  "#include <sys/wait.h>",
  "#include <ucontext.h>",
  "#include <unistd.h>",
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
// Blocks that demonstrate undefined behavior or a compiler warning on purpose.
const warnsOnPurpose = (code) => /^\s*\/\/ (Undefined behavior|Warns)\b/.test(code);

function compile(file, cwd) {
  return new Promise((resolve) => {
    const child = spawn("g++", ["-std=c++20", "-fsyntax-only", "-Wall", "-Wno-unused", file], {
      cwd,
    });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (status) => resolve({ status, stderr: stderr.trim() }));
  });
}

async function checkCpp(blocks, tmp) {
  // One compile per block keeps error messages attributable; the prelude is precompiled and
  // blocks compile in parallel.
  const header = join(tmp, "prelude.hpp");
  writeFileSync(header, PRELUDE);
  spawnSync("g++", ["-std=c++20", "-x", "c++-header", header, "-o", `${header}.gch`]);
  const files = blocks.map((b, i) => {
    const body = b.code
      .split("\n")
      .filter((l) => !/^\s*#include\b/.test(l) && !/^\s*using namespace std;\s*$/.test(l))
      .join("\n");
    // A block with main stays at global scope; main becomes block_main with a deduced return
    // type, so a main without `return 0;` (legal for main only) compiles without a warning.
    const hasMain = /\bint\s+main\s*\(/.test(body);
    const src = hasMain
      ? `#include "prelude.hpp"\n${body.replace(/\bint\s+main\s*\(/, "auto block_main(")}\n`
      : `#include "prelude.hpp"\nnamespace block_${i} {\n${body}\n}\n`;
    const file = join(tmp, `b${i}.cpp`);
    writeFileSync(file, src);
    return file;
  });
  const results = new Array(blocks.length);
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      results[i] = await compile(files[i], tmp);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, availableParallelism()) }, worker));
  const failures = [];
  results.forEach(({ status, stderr }, i) => {
    if (status !== 0) failures.push({ block: blocks[i], message: stderr });
    else if (/warning:/.test(stderr) && !warnsOnPurpose(blocks[i].code))
      failures.push({ block: blocks[i], message: stderr, warning: true });
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

const JAVA_IMPORTS = [
  "java.util.*",
  "java.util.function.*",
  "java.util.stream.*",
  "java.util.concurrent.*",
  "java.util.concurrent.atomic.*",
  "java.util.concurrent.locks.*",
  "java.io.*",
];

function checkJava(blocks, tmp) {
  // One javac run for every block (the JVM starts once); each block lives in package b<i>, so
  // blocks may reuse class names, and errors are attributed through the file path.
  const topLevelType =
    /^(public\s+)?((abstract|final|sealed|non-sealed|static)\s+)*(class|interface|enum|record|@interface)\s/;
  const files = blocks.map((b, i) => {
    const lines = b.code.split("\n");
    const imports = lines.filter((l) => /^import\s/.test(l));
    const body = lines
      .filter((l) => !/^import\s/.test(l))
      .map((l) =>
        l.replace(
          /^public\s+(?=((abstract|final|sealed|non-sealed)\s+)*(class|interface|enum|record)\s)/,
          "",
        ),
      );
    const wrapped = body.some((l) => topLevelType.test(l))
      ? body
      : [`class Snippet${i} {`, ...body, "}"];
    const head = [`package b${i};`, ...JAVA_IMPORTS.map((p) => `import ${p};`), ...imports];
    const dir = join(tmp, "java", `b${i}`);
    mkdirSync(dir, { recursive: true });
    const file = join(dir, "Snippet.java");
    writeFileSync(file, [...head, ...wrapped].join("\n") + "\n");
    return { file, offset: head.length + (wrapped === body ? 0 : 1) };
  });
  if (!files.length) return [];
  const r = spawnSync(
    "javac",
    [
      "-proc:none",
      "-nowarn",
      "-Xmaxerrs",
      "10000",
      "-d",
      join(tmp, "java-out"),
      ...files.map((f) => f.file),
    ],
    { encoding: "utf8", env: { ...process.env, JAVA_TOOL_OPTIONS: "" } },
  );
  if (r.status === 0) return [];
  const byBlock = new Map();
  for (const m of r.stderr.matchAll(/b(\d+)[\\/]Snippet\.java:(\d+): error: (.*)/g)) {
    const i = Number(m[1]);
    const line = Number(m[2]) - files[i].offset;
    byBlock.set(i, [...(byBlock.get(i) ?? []), `error: line ${line}: ${m[3]}`]);
  }
  if (!byBlock.size) throw new Error(r.stderr);
  return [...byBlock].map(([i, messages]) => ({ block: blocks[i], message: messages.join("\n") }));
}

async function main() {
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const subjects = readdirSync(CONTENT).filter(
    (d) => statSync(join(CONTENT, d)).isDirectory() && (!wanted.length || wanted.includes(d)),
  );
  const cpp = [];
  const py = [];
  const java = [];
  for (const s of subjects) {
    for (const f of readdirSync(join(CONTENT, s)).filter((f) => f.endsWith(".md"))) {
      const path = join(CONTENT, s, f);
      for (const b of blocksOf(readFileSync(path, "utf8"))) {
        const block = { ...b, file: relative(ROOT, path) };
        if (skipped(b.code)) continue;
        if (b.lang === "cpp") cpp.push(block);
        else if (b.lang === "python") py.push(block);
        else if (b.lang === "java") java.push(block);
      }
    }
  }
  const tmp = mkdtempSync(join(tmpdir(), "atlas-code-"));
  let failures = [];
  try {
    if (has("g++", ["--version"])) failures.push(...(await checkCpp(cpp, tmp)));
    else console.warn("! g++ not found; C++ blocks not checked");
    if (has("python3", ["--version"])) failures.push(...checkPython(py));
    else console.warn("! python3 not found; Python blocks not checked");
    if (has("javac", ["-version"])) failures.push(...checkJava(java, tmp));
    else console.warn("! javac not found; Java blocks not checked");
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
    `\n${errors ? "✗" : "✓"} ${cpp.length} C++, ${py.length} Python and ${java.length} Java blocks checked: ${errors} error(s), ${failures.length - errors} warning(s).`,
  );
  process.exit(errors ? 1 : 0);
}

await main();
