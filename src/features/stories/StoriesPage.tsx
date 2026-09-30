// Stories (F27): the behavioral story bank. Tabs for your stories (list and STAR editor), the
// coverage matrix (questions × stories), timed practice, and the "Tell me about yourself"
// builder. The tab, the open story and the practice question live in the URL
// (#/stories?tab=practice&question=bq-…), so plan items and links open the right place.
import { ArrowLeft, MessageSquareQuote, Plus } from "lucide-react";
import { useMemo } from "react";
import { navigate, routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { useMediaQuery } from "@/components/ui/hooks";
import { EmptyState, PageSkeleton } from "@/components/ui/Misc";
import { Tabs } from "@/components/ui/Tabs";
import { BEHAVIORAL_QUESTIONS } from "@/data/behavioral.seed";
import { coverageMatrix, isIntro, UNSORTED_STORY_ID } from "@/lib/stories/stories";
import type { Story } from "@/lib/types";
import { addStory, useStoryStore } from "@/stores/storyStore";
import { Coverage } from "./Coverage";
import { IntroBuilder } from "./IntroBuilder";
import { Practice } from "./Practice";
import { StoryEditor } from "./StoryEditor";

type Tab = "stories" | "coverage" | "practice" | "intro";
const TABS: Tab[] = ["stories", "coverage", "practice", "intro"];

function StoryList({
  stories,
  selected,
  onNew,
}: {
  stories: Story[];
  selected: string | null;
  onNew: () => void;
}) {
  const unsorted = stories.find((s) => s.id === UNSORTED_STORY_ID);
  const list = stories.filter((s) => s.id !== UNSORTED_STORY_ID);
  return (
    <nav aria-label="Your stories" className="space-y-3">
      <Button variant="primary" icon={Plus} onClick={onNew} className="w-full">
        New story
      </Button>
      {list.length === 0 ? (
        <p className="text-sm text-muted">No stories yet.</p>
      ) : (
        <ul className="divide-y divide-rule overflow-hidden rounded-panel bg-surface">
          {list.map((s) => (
            <li key={s.id}>
              <a
                href={routeHref("/stories", undefined, { story: s.id })}
                aria-current={selected === s.id ? "page" : undefined}
                className={cx(
                  "block px-3 py-2.5 hover:bg-surface-sunken",
                  selected === s.id && "bg-accent-soft hover:bg-accent-soft",
                )}
              >
                <span className="block truncate text-base font-medium text-text">{s.title}</span>
                <span className="block text-sm text-muted">
                  {isIntro(s)
                    ? "Your 90-second script"
                    : `${s.questionIds.length} ${s.questionIds.length === 1 ? "question" : "questions"}`}
                  {s.practice?.length ? `, practiced ${s.practice.length}×` : ""}
                  {s.tags.length > 0 && !isIntro(s) ? `, ${s.tags.slice(0, 3).join(", ")}` : ""}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {unsorted?.practice?.length ? (
        <a
          href={routeHref("/stories", undefined, { tab: "practice" })}
          className="block rounded-panel border border-dashed border-rule-strong px-3 py-2.5 text-sm text-muted hover:text-text"
        >
          Unsorted practice: {unsorted.practice.length}{" "}
          {unsorted.practice.length === 1 ? "answer" : "answers"} without a story
        </a>
      ) : null}
    </nav>
  );
}

export default function StoriesPage() {
  const route = useRoute();
  const loaded = useStoryStore((s) => s.loaded);
  const record = useStoryStore((s) => s.stories);
  const stories = useMemo(
    () =>
      Object.values(record).sort((a, b) => {
        // Your script first, then newest first.
        if (isIntro(a) !== isIntro(b)) return isIntro(a) ? -1 : 1;
        return (a.createdAt ?? a.updatedAt) < (b.createdAt ?? b.updatedAt) ? 1 : -1;
      }),
    [record],
  );
  const wide = useMediaQuery("(min-width: 1024px)");
  const storyParam = route.query.get("story");
  const questionParam = route.query.get("question");
  const tabParam = route.query.get("tab") as Tab | null;
  const tab: Tab =
    tabParam && TABS.includes(tabParam) ? tabParam : questionParam ? "practice" : "stories";
  const selected =
    storyParam && record[storyParam] && storyParam !== UNSORTED_STORY_ID
      ? record[storyParam]!
      : null;
  const matrix = useMemo(() => coverageMatrix(stories, BEHAVIORAL_QUESTIONS), [stories]);

  const setTab = (t: Tab) =>
    navigate(routeHref("/stories", undefined, t === "stories" ? {} : { tab: t }));
  const newStory = () => navigate(routeHref("/stories", undefined, { story: addStory() }));

  const own = stories.filter((s) => s.id !== UNSORTED_STORY_ID);
  return (
    <PageFrame>
      <PageHeader
        title="Stories"
        description="Prepared, specific stories for behavioral rounds. Write each once in the STAR format, link the questions it answers, then practice saying it in two minutes."
      />
      {!loaded ? (
        <PageSkeleton />
      ) : (
        <Tabs<Tab>
          label="Stories"
          value={tab}
          onChange={setTab}
          className="space-y-6"
          items={[
            { value: "stories", label: "Your stories", count: own.length },
            { value: "coverage", label: "Coverage", count: matrix.uncovered.length || undefined },
            { value: "practice", label: "Practice" },
            { value: "intro", label: "Tell me about yourself" },
          ]}
        >
          {(t) =>
            t === "coverage" ? (
              <Coverage stories={stories} />
            ) : t === "practice" ? (
              <Practice
                stories={stories}
                questionId={questionParam}
                storyId={storyParam ?? undefined}
                onQuestion={(id) =>
                  navigate(routeHref("/stories", undefined, { tab: "practice", question: id }), {
                    replace: true,
                  })
                }
              />
            ) : t === "intro" ? (
              <IntroBuilder />
            ) : own.length === 0 ? (
              <EmptyState
                icon={MessageSquareQuote}
                drawing="tent"
                title="No stories yet"
                actions={
                  <>
                    <Button variant="primary" icon={Plus} onClick={newStory}>
                      Write your first story
                    </Button>
                    <Button onClick={() => setTab("intro")}>Build “Tell me about yourself”</Button>
                  </>
                }
              >
                Pick something you did: an internship problem you solved, a project that went wrong,
                a disagreement you worked through. One story can answer several questions.
              </EmptyState>
            ) : wide ? (
              <div className="grid grid-cols-[280px_minmax(0,1fr)] gap-8">
                <StoryList stories={stories} selected={selected?.id ?? null} onNew={newStory} />
                {selected ? (
                  <StoryEditor key={selected.id} story={selected} />
                ) : (
                  <EmptyState icon={MessageSquareQuote} title="Open a story to edit it" compact>
                    Or start a new one. The Coverage tab shows which questions still need a story.
                  </EmptyState>
                )}
              </div>
            ) : selected ? (
              <div className="space-y-4">
                <a
                  href={routeHref("/stories")}
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  All stories
                </a>
                <StoryEditor key={selected.id} story={selected} />
              </div>
            ) : (
              <StoryList stories={stories} selected={null} onNew={newStory} />
            )
          }
        </Tabs>
      )}
    </PageFrame>
  );
}
