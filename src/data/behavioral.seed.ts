// Behavioral question bank (BUILD_SPEC.md 8.5, F27). Stories map to questions many-to-many;
// `suggestedTags` hint which kind of story fits each question.
import { slugifyConceptName } from "@/lib/slug";
import type { BehavioralQuestion } from "@/lib/types";

/** Story tags the app suggests (owners can add their own). */
export const STORY_TAGS = [
  "introduction",
  "motivation",
  "failure",
  "conflict",
  "teamwork",
  "ownership",
  "challenge",
  "learning",
  "deadline",
  "feedback",
  "leadership",
  "decision-making",
  "simplification",
  "customer-focus",
  "mistake",
  "prioritization",
  "influence",
  "pressure",
  "achievement",
  "career-goals",
  "self-awareness",
  "helping-others",
  "process-improvement",
  "ambiguity",
  "difficult-people",
  "saying-no",
  "planning",
] as const;

export type StoryTag = (typeof STORY_TAGS)[number];

function q(text: string, suggestedTags: StoryTag[]): BehavioralQuestion {
  return { id: `bq-${slugifyConceptName(text)}`, text, suggestedTags };
}

export const BEHAVIORAL_QUESTIONS: readonly BehavioralQuestion[] = [
  q("Tell me about yourself", ["introduction", "motivation"]),
  q("Why this company?", ["motivation", "career-goals"]),
  q("Why this role?", ["motivation", "career-goals"]),
  q("Tell me about a time you failed", ["failure", "learning", "self-awareness"]),
  q("A time you disagreed with a teammate", ["conflict", "teamwork", "influence"]),
  q("A time you had a conflict and how you resolved it", [
    "conflict",
    "teamwork",
    "difficult-people",
  ]),
  q("A time you took ownership beyond your role", ["ownership", "leadership"]),
  q("Your most challenging project", ["challenge", "achievement", "ownership"]),
  q("A time you learned something quickly", ["learning", "challenge"]),
  q("A time you missed a deadline", ["deadline", "failure", "planning"]),
  q("A time you received critical feedback", ["feedback", "learning", "self-awareness"]),
  q("A time you led without authority", ["leadership", "influence", "teamwork"]),
  q("A time you made a decision with incomplete data", ["decision-making", "ambiguity"]),
  q("A time you simplified something complex", ["simplification", "process-improvement"]),
  q("A time you went above and beyond for a user", ["customer-focus", "ownership"]),
  q("A mistake you made and what you changed", ["mistake", "learning", "self-awareness"]),
  q("A time you had to prioritise between competing tasks", [
    "prioritization",
    "deadline",
    "planning",
  ]),
  q("A time you convinced others to change direction", [
    "influence",
    "leadership",
    "decision-making",
  ]),
  q("A time you worked under pressure", ["pressure", "deadline"]),
  q("The project you're proudest of", ["achievement", "ownership"]),
  q("Where do you see yourself in 3 years?", ["career-goals", "motivation"]),
  q("What are your strengths and weaknesses?", ["self-awareness", "learning"]),
  q("Why should we hire you?", ["achievement", "motivation"]),
  q("A time you helped a struggling teammate", ["helping-others", "teamwork"]),
  q("A time you improved a process", ["process-improvement", "ownership"]),
  q("A time you handled ambiguity", ["ambiguity", "decision-making"]),
  q("A time you dealt with a difficult person", ["difficult-people", "conflict"]),
  q("A time you had to say no", ["saying-no", "prioritization"]),
  q("What would you do in your first 90 days?", ["planning", "motivation"]),
  q("Do you have any questions for us?", ["motivation", "planning"]),
];
