// Default mistake tags (BUILD_SPEC.md 8.6). They become stored records on first run, so the owner
// can add, rename, merge (re-tagging attempts) and archive them. Ids never change once shipped.
import type { MistakeCategory, MistakeTag } from "@/lib/types";

type SeedTag = Omit<MistakeTag, "updatedAt" | "custom">;

function tag(category: MistakeCategory, id: string, label: string, howToAvoid: string): SeedTag {
  return { id: `mt-${id}`, label, category, howToAvoid };
}

export const MISTAKE_TAG_SEED: readonly SeedTag[] = [
  // edge-case
  tag(
    "edge-case",
    "empty-input",
    "Empty input",
    "Ask what happens with no elements before writing the loop.",
  ),
  tag(
    "edge-case",
    "single-element",
    "Single element",
    "Trace your code once with a one-element input.",
  ),
  tag(
    "edge-case",
    "duplicates",
    "Duplicates not handled",
    "Test an input where every value appears twice.",
  ),
  tag(
    "edge-case",
    "negative-numbers",
    "Negative numbers",
    "Check whether any assumption breaks when values are negative.",
  ),
  tag(
    "edge-case",
    "all-equal",
    "All elements equal",
    "Test an input where every element is the same.",
  ),
  tag(
    "edge-case",
    "very-large-input",
    "Very large input",
    "Check the maximum constraint against your complexity and data types.",
  ),
  tag(
    "edge-case",
    "null-node",
    "Null or missing node",
    "Handle null children and empty lists before touching their fields.",
  ),
  // logic
  tag(
    "logic",
    "off-by-one",
    "Off-by-one",
    "Write the loop invariant, then check the first and last iteration.",
  ),
  tag(
    "logic",
    "wrong-loop-bounds",
    "Wrong loop bounds",
    "Decide inclusive or exclusive bounds up front and keep them consistent.",
  ),
  tag(
    "logic",
    "forgot-reset",
    "Forgot to reset state",
    "Reset counters, sets and flags at the start of each outer iteration or test case.",
  ),
  tag(
    "logic",
    "mutated-input",
    "Mutated input by accident",
    "Copy the input before changing it unless in-place is intended.",
  ),
  tag(
    "logic",
    "wrong-base-case",
    "Wrong base case",
    "Check the smallest inputs (0, 1, empty) against your base case by hand.",
  ),
  tag(
    "logic",
    "missing-dp-state",
    "Missing DP state or transition",
    "List every choice at a step and make sure the state captures what it needs.",
  ),
  tag(
    "logic",
    "wrong-comparison",
    "Wrong comparison operator",
    "Say the condition in words, then compare it with < versus <= in the code.",
  ),
  tag(
    "logic",
    "visited-misuse",
    "Visited set misuse",
    "Mark visited when you push, not when you pop, unless the algorithm says otherwise.",
  ),
  tag(
    "logic",
    "cycle-not-handled",
    "Cycle not handled",
    "Ask whether the graph or list can loop, and track visited nodes if so.",
  ),
  // complexity
  tag(
    "complexity",
    "tle",
    "Time limit exceeded (suboptimal approach)",
    "Compare your complexity with the constraints before coding.",
  ),
  tag(
    "complexity",
    "mle",
    "Memory limit exceeded",
    "Estimate memory for the largest input and keep only what the next step needs.",
  ),
  tag(
    "complexity",
    "unnecessary-copying",
    "Unnecessary copying",
    "Pass by reference and avoid building new strings or arrays inside loops.",
  ),
  // pattern
  tag(
    "pattern",
    "wrong-pattern",
    "Wrong pattern chosen",
    "List two candidate patterns and check each against the problem's signals.",
  ),
  tag(
    "pattern",
    "greedy-vs-dp",
    "Greedy used where DP was needed",
    "Look for a counterexample to the greedy choice before trusting it.",
  ),
  tag(
    "pattern",
    "missed-simpler",
    "Missed a simpler approach",
    "State the brute force first, then find the one bottleneck to remove.",
  ),
  // language
  tag(
    "language",
    "integer-overflow",
    "Integer overflow",
    "Use 64-bit integers when sums or products can exceed about 2 billion.",
  ),
  tag(
    "language",
    "float-precision",
    "Floating point precision",
    "Compare floats with an epsilon, or keep the math in integers.",
  ),
  tag(
    "language",
    "container-misuse",
    "Container misuse (wrong method or cost)",
    "Know the cost of each container method you call inside a loop.",
  ),
  tag(
    "language",
    "iterator-invalidation",
    "Iterator invalidation",
    "Don't insert into or erase from a container while iterating it without care.",
  ),
  tag(
    "language",
    "comparator-bug",
    "Comparator bug",
    "A comparator must be a strict weak ordering: never return true for equal items.",
  ),
  // reading
  tag(
    "reading",
    "misread-problem",
    "Misread the problem",
    "Restate the problem in your own words before starting.",
  ),
  tag(
    "reading",
    "missed-constraint",
    "Missed a constraint",
    "Underline every constraint and note what each one allows.",
  ),
  tag(
    "reading",
    "wrong-output-format",
    "Wrong output format",
    "Check the expected return type and format against an example.",
  ),
  // other
  tag(
    "other",
    "ran-out-of-time",
    "Ran out of time",
    "Set checkpoints: approach by 10 minutes, code by 30, testing by 40.",
  ),
  tag(
    "other",
    "panicked",
    "Panicked or froze",
    "When stuck, go back to a small example and solve it by hand, out loud.",
  ),
  tag(
    "other",
    "didnt-test",
    "Didn't test before submitting",
    "Dry-run one normal case and one edge case before every submit.",
  ),
];
