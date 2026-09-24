// The user-data tables (BUILD_SPEC.md section 4.3) and the key field of each one.
// The singleton Profile is handled separately, and Secrets never leave IndexedDB.
import type {
  ActivityMonth,
  Check,
  ConceptNote,
  ConceptState,
  CustomConcept,
  DayPlan,
  DesignAttempt,
  GeneratedDrill,
  MapOverride,
  MentalMathRun,
  MistakeTag,
  MockSession,
  ProblemState,
  Story,
} from "@/lib/types";

export const TABLE_NAMES = [
  "conceptStates",
  "conceptNotes",
  "problemStates",
  "mistakeTags",
  "checks",
  "dayPlans",
  "activity",
  "mocks",
  "designs",
  "stories",
  "mentalMath",
  "mapOverrides",
  "customConcepts",
  "generatedDrills",
] as const;

export type TableName = (typeof TABLE_NAMES)[number];

export interface TableTypes {
  conceptStates: ConceptState;
  conceptNotes: ConceptNote;
  problemStates: ProblemState;
  mistakeTags: MistakeTag;
  checks: Check;
  dayPlans: DayPlan;
  activity: ActivityMonth;
  mocks: MockSession;
  designs: DesignAttempt;
  stories: Story;
  mentalMath: MentalMathRun;
  mapOverrides: MapOverride;
  customConcepts: CustomConcept;
  generatedDrills: GeneratedDrill;
}

/** The field that identifies each record. */
export const TABLE_KEY: { [K in TableName]: keyof TableTypes[K] & string } = {
  conceptStates: "conceptId",
  conceptNotes: "conceptId",
  problemStates: "problemId",
  mistakeTags: "id",
  checks: "id",
  dayPlans: "date",
  activity: "month",
  mocks: "id",
  designs: "id",
  stories: "id",
  mentalMath: "id",
  mapOverrides: "nodeId",
  customConcepts: "id",
  generatedDrills: "id",
};

export function keyOf<K extends TableName>(table: K, value: TableTypes[K]): string {
  return String((value as unknown as Record<string, unknown>)[TABLE_KEY[table]]);
}

/** Plain-language names, used in import previews and error messages. */
export const TABLE_LABELS: Record<TableName, string> = {
  conceptStates: "concept progress",
  conceptNotes: "notes",
  problemStates: "problems",
  mistakeTags: "mistake tags",
  checks: "checks",
  dayPlans: "daily plans",
  activity: "activity months",
  mocks: "mock interviews",
  designs: "design attempts",
  stories: "stories",
  mentalMath: "mental math runs",
  mapOverrides: "moved map bubbles",
  customConcepts: "your own concepts",
  generatedDrills: "generated drills",
};
