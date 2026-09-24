// Types for scripts/lib/spec-prereqs.mjs (used by tests).
export const SPEC_PREREQ_EDGES: [string, string][];
export const SPEC_PREREQ_RULES: {
  from: string;
  toPatternsInTopics?: string[];
  toAllInTopic?: string;
}[];
