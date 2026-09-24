// Checks typed answers to quant puzzles (BUILD_SPEC.md F28). Numbers, fractions, decimals,
// percentages and simple expressions are accepted within 0.5% relative tolerance, using a small
// recursive-descent parser (numbers, + - * / ^, parentheses, e, pi, sqrt). It never uses eval.
// Expected answers may contain a variable such as n ("1/(n+1)"); both sides are then compared at
// several values of the variable. Yes/no answers are compared as words.

export const RELATIVE_TOLERANCE = 0.005;

export class ExpressionError extends Error {}

type Token =
  | { type: "num"; value: number }
  | { type: "id"; value: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" | "(" | ")" | "%" };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.,]/.test(src[j]!)) j++;
      const raw = src.slice(i, j).replace(/,(?=\d{3}(\D|$))/g, "");
      if (raw.includes(",") || (raw.match(/\./g) ?? []).length > 1 || raw === ".") {
        throw new ExpressionError(`Can't read the number "${src.slice(i, j)}"`);
      }
      tokens.push({ type: "num", value: Number(raw) });
      i = j;
      continue;
    }
    if (/[a-zπ√]/i.test(ch)) {
      if (ch === "π") {
        tokens.push({ type: "id", value: "pi" });
        i++;
        continue;
      }
      if (ch === "√") {
        tokens.push({ type: "id", value: "sqrt" });
        i++;
        continue;
      }
      let j = i;
      while (j < src.length && /[a-z]/i.test(src[j]!)) j++;
      tokens.push({ type: "id", value: src.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    const op =
      ch === "×" || ch === "·" ? "*" : ch === "÷" ? "/" : ch === "−" || ch === "–" ? "-" : ch;
    if ("+-*/^()%".includes(op)) {
      if (op === "*" && src[i + 1] === "*") {
        tokens.push({ type: "op", value: "^" });
        i += 2;
        continue;
      }
      tokens.push({ type: "op", value: op as "+" });
      i++;
      continue;
    }
    throw new ExpressionError(`Unexpected "${ch}"`);
  }
  return tokens;
}

const CONSTANTS: Record<string, number> = { e: Math.E, pi: Math.PI };
const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  ln: Math.log,
  log: Math.log10,
};

/** Evaluates an arithmetic expression. Throws ExpressionError when it can't be read. */
export function evaluateExpression(src: string, vars: Record<string, number> = {}): number {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v: string) => {
    const t = peek();
    return t?.type === "op" && t.value === v;
  };
  const startsPrimary = () => {
    const t = peek();
    return (
      t !== undefined &&
      (t.type === "num" || t.type === "id" || (t.type === "op" && t.value === "("))
    );
  };

  // expr   := term (("+" | "-") term)*
  // term   := unary (("*" | "/") unary | implicit unary)*
  // unary  := "-" unary | "+" unary | power
  // power  := postfix ("^" unary)?
  // postfix:= primary "%"?
  // primary:= number | constant | variable | function primary | "(" expr ")"
  function expr(): number {
    let value = term();
    while (isOp("+") || isOp("-")) {
      const op = (tokens[pos++] as { value: string }).value;
      const rhs = term();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  function term(): number {
    let value = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = (tokens[pos++] as { value: string }).value;
        const rhs = unary();
        value = op === "*" ? value * rhs : value / rhs;
      } else if (startsPrimary()) {
        value *= unary(); // implicit multiplication: 2pi, 3(4), 2sqrt(2)
      } else {
        return value;
      }
    }
  }
  function unary(): number {
    if (isOp("-")) {
      pos++;
      return -unary();
    }
    if (isOp("+")) {
      pos++;
      return unary();
    }
    return power();
  }
  function power(): number {
    const base = postfix();
    if (isOp("^")) {
      pos++;
      return base ** unary();
    }
    return base;
  }
  function postfix(): number {
    const value = primary();
    if (isOp("%")) {
      pos++;
      return value / 100;
    }
    return value;
  }
  function primary(): number {
    const t = tokens[pos++];
    if (!t) throw new ExpressionError("The answer ends too early");
    if (t.type === "num") return t.value;
    if (t.type === "id") {
      if (t.value in FUNCTIONS) return FUNCTIONS[t.value]!(postfix());
      if (t.value in vars) return vars[t.value]!;
      if (t.value in CONSTANTS) return CONSTANTS[t.value]!;
      throw new ExpressionError(`Unknown name "${t.value}"`);
    }
    if (t.value === "(") {
      const value = expr();
      if (!isOp(")")) throw new ExpressionError("A bracket is not closed");
      pos++;
      return value;
    }
    throw new ExpressionError(`Unexpected "${t.value}"`);
  }

  const value = expr();
  if (pos !== tokens.length) throw new ExpressionError("Extra text after the answer");
  if (!Number.isFinite(value)) throw new ExpressionError("The answer isn't a finite number");
  return value;
}

/** Names in an expression that are not constants or functions (variables such as n). */
export function variablesIn(src: string): string[] {
  try {
    return [
      ...new Set(
        tokenize(src)
          .filter((t): t is { type: "id"; value: string } => t.type === "id")
          .map((t) => t.value)
          .filter((v) => !(v in CONSTANTS) && !(v in FUNCTIONS)),
      ),
    ];
  } catch {
    return [];
  }
}

const YES = new Set(["yes", "y", "true", "first", "wins"]);
const NO = new Set(["no", "n", "false"]);

/** Strips filler around a typed answer: "about 0.507", "x = 6", "7.5 degrees", "≈ 2.718". */
function candidates(input: string): string[] {
  let s = input
    .trim()
    .toLowerCase()
    .replace(/[≈~°]/g, " ")
    .replace(/[.!;,]+$/, "");
  const eq = s.lastIndexOf("=");
  if (eq >= 0) s = s.slice(eq + 1);
  s = s.replace(/^(about|approximately|approx\.?|roughly|around|it's|it is)\s+/, "").trim();
  const out = [s];
  let trimmed = s;
  for (let i = 0; i < 3; i++) {
    const next = trimmed.replace(/\s*[a-z]+\.?$/, "").trim();
    if (next === trimmed || !next) break;
    trimmed = next;
    out.push(trimmed);
  }
  return out;
}

export type AnswerVerdict = "correct" | "incorrect" | "unreadable";

export function closeEnough(
  actual: number,
  expected: number,
  tolerance = RELATIVE_TOLERANCE,
): boolean {
  return Math.abs(actual - expected) <= tolerance * Math.max(Math.abs(expected), 1e-9) + 1e-12;
}

/** Compares a typed answer with the expected one. */
export function checkAnswer(input: string, expected: string): AnswerVerdict {
  const exp = expected.trim().toLowerCase();
  if (YES.has(exp) || NO.has(exp)) {
    const word =
      input
        .trim()
        .toLowerCase()
        .replace(/[^a-z ]/g, "")
        .split(/\s+/)[0] ?? "";
    if (!YES.has(word) && !NO.has(word)) return "unreadable";
    return YES.has(word) === YES.has(exp) ? "correct" : "incorrect";
  }
  const vars = variablesIn(expected);
  const samples = vars.length ? [2, 3, 5, 10] : [0];
  for (const candidate of candidates(input)) {
    try {
      const ok = samples.every((v) => {
        const scope = Object.fromEntries(vars.map((name) => [name, v]));
        return closeEnough(
          evaluateExpression(candidate, scope),
          evaluateExpression(expected, scope),
        );
      });
      return ok ? "correct" : "incorrect";
    } catch {
      /* try the next, more trimmed candidate */
    }
  }
  return "unreadable";
}
