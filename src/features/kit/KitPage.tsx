// The design kit (section 12.7): every component on one page, in the current theme. Linked from
// Settings → About. Useful for reviewing the design system and for screenshots.
import { Bell, Filter, Plus, Settings2, Trash2 } from "lucide-react";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button, IconButton } from "@/components/ui/Button";
import {
  Chip,
  DifficultyChip,
  ImportanceChip,
  PatternChip,
  StatusChip,
  TagChip,
} from "@/components/ui/Chip";
import { BottomSheet, Dialog, Drawer } from "@/components/ui/Dialog";
import { Field, Input, Select, Slider, Switch, Textarea } from "@/components/ui/Field";
import { Callout, CodeSpans, EmptyState, Kbd, Skeleton } from "@/components/ui/Misc";
import { MOD_KEY } from "@/components/ui/platform";
import { MultiCombobox } from "@/components/ui/MultiCombobox";
import { Menu, Popover } from "@/components/ui/Popover";
import { ProgressBar, ProgressRing, SegmentedBar, Tile } from "@/components/ui/Progress";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatusGlyph } from "@/components/ui/StatusGlyph";
import { STATUS_ORDER } from "@/components/ui/labels";
import { Tabs } from "@/components/ui/Tabs";
import { Timer } from "@/components/ui/Timer";
import { useTimer } from "@/components/ui/timer";
import { Tooltip } from "@/components/ui/Tooltip";
import { CodeView } from "@/components/ui/code/CodeView";
import { concepts } from "@/data/syllabus";
import { toast } from "@/stores/toastStore";

const MarkdownView = lazy(() => import("@/components/ui/MarkdownView"));
const CodeEditor = lazy(() => import("@/components/ui/code/CodeEditor"));
const DiffView = lazy(() =>
  import("@/components/ui/code/DiffView").then((m) => ({ default: m.DiffView })),
);
const Charts = lazy(() => import("./KitCharts"));

const SAMPLE_CODE = `#include <vector>
#include <queue>
using namespace std;

// Shortest distance from src to every node (edges all cost 1).
vector<int> bfs(const vector<vector<int>>& adj, int src) {
    vector<int> dist(adj.size(), -1);
    queue<int> q;
    dist[src] = 0;
    q.push(src);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : adj[u]) {
            if (dist[v] == -1) { dist[v] = dist[u] + 1; q.push(v); }
        }
    }
    return dist;
}`;

const SAMPLE_CODE_V2 = SAMPLE_CODE.replace(
  "            if (dist[v] == -1) { dist[v] = dist[u] + 1; q.push(v); }",
  "            if (dist[v] != -1) continue;\n            dist[v] = dist[u] + 1;\n            q.push(v);",
).replace("int u = q.front(); q.pop();", "int u = q.front();\n        q.pop();");

const SAMPLE_MARKDOWN = `BFS explores a graph **in rings**, like ripples from a stone dropped in water.

- Visits every node one step away, then two steps away, and so on.
- Finds shortest paths when every edge costs the same: $O(V + E)$ time.
- Use a queue; mark nodes when you **push** them, not when you pop them.

$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$

| Structure | Push | Pop |
|---|---|---|
| Queue | $O(1)$ | $O(1)$ |
| Heap | $O(\\log n)$ | $O(\\log n)$ |

\`\`\`python
from collections import deque

def bfs(adj, src):
    dist = {src: 0}
    q = deque([src])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if v not in dist:
                dist[v] = dist[u] + 1
                q.append(v)
    return dist
\`\`\`
`;

const COMBO_OPTIONS = concepts
  .filter((c) => c.isPattern)
  .map((c) => ({ value: c.id, label: c.name, detail: c.topicId }));

function Demo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-panel border border-rule bg-surface">
      <h2 className="border-b border-rule px-4 py-2.5 text-base font-semibold text-text">
        {title}
      </h2>
      <div className="flex flex-col gap-4 p-4">{children}</div>
    </section>
  );
}

function Loading() {
  return <Skeleton className="h-40 w-full" />;
}

export default function KitPage() {
  const [segment, setSegment] = useState<"simple" | "interview" | "deep">("simple");
  const [tab, setTab] = useState<"learn" | "practice" | "notes" | "ask">("learn");
  const [switchOn, setSwitchOn] = useState(true);
  const [slider, setSlider] = useState(60);
  const [picked, setPicked] = useState<string[]>([]);
  const [dialog, setDialog] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [code, setCode] = useState(SAMPLE_CODE);
  const timer = useTimer();

  return (
    <PageFrame className="max-w-7xl">
      <PageHeader
        title="Design kit"
        description="Every building block of Atlas, drawn with the current theme's tokens."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Demo title="Buttons">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" icon={Plus}>
              Save attempt
            </Button>
            <Button>Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" icon={Trash2}>
              Delete
            </Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary">
              Small primary
            </Button>
            <Button size="sm">Small</Button>
            <IconButton icon={Settings2} label="Settings" />
            <IconButton icon={Filter} label="Filters" variant="secondary" />
            <IconButton icon={Bell} label="Notify" variant="primary" shortcut="N" />
          </div>
        </Demo>

        <Demo title="Status, difficulty and chips">
          <div className="flex flex-wrap items-center gap-4">
            {STATUS_ORDER.map((s) => (
              <span key={s} className="flex items-center gap-2">
                <StatusGlyph status={s} size={12} />
                <StatusGlyph status={s} size={20} />
                <StatusGlyph status={s} size={36} />
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => (
              <StatusChip key={s} status={s} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <DifficultyChip difficulty="easy" />
            <DifficultyChip difficulty="medium" />
            <DifficultyChip difficulty="hard" />
            <ImportanceChip importance="must" />
            <ImportanceChip importance="important" />
            <ImportanceChip importance="advanced" />
          </div>
          <div className="flex flex-wrap gap-2">
            <PatternChip label="Sliding window" href="#/kit" />
            <TagChip label="Off-by-one" onRemove={() => toast("Tag removed.")} />
            <Chip>About 25 min</Chip>
          </div>
        </Demo>

        <Demo title="Progress">
          <div className="flex flex-wrap items-center gap-6">
            <ProgressRing value={0.42} label="42% of must-know concepts strong" size={56}>
              42
            </ProgressRing>
            <ProgressRing value={0.8} label="80%" tone="strong" />
            <div className="min-w-48 flex-1 space-y-3">
              <ProgressBar value={0.35} label="35 of 90 minutes" />
              <SegmentedBar counts={{ not_started: 12, learning: 6, strong: 9, fading: 2 }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Tile
              title="Two pointers"
              footer={<SegmentedBar counts={{ strong: 3, learning: 1 }} />}
            >
              3 easy, 2 medium
            </Tile>
            <Tile title="Sliding window" emphasis>
              No hard yet
            </Tile>
            <Tile title="Heaps" onClick={() => toast("Tile clicked.")}>
              1 medium
            </Tile>
          </div>
        </Demo>

        <Demo title="Segmented control and tabs">
          <SegmentedControl
            label="Depth"
            value={segment}
            onChange={setSegment}
            options={[
              { value: "simple", label: "Simple" },
              { value: "interview", label: "Interview" },
              { value: "deep", label: "Deep" },
            ]}
          />
          <Tabs
            label="Concept"
            value={tab}
            onChange={setTab}
            items={[
              { value: "learn", label: "Learn" },
              { value: "practice", label: "Practice", count: 6 },
              { value: "notes", label: "Notes" },
              { value: "ask", label: "Ask" },
            ]}
          >
            {(v) => <p className="pt-3 text-base text-muted">The {v} tab.</p>}
          </Tabs>
        </Demo>

        <Demo title="Form controls">
          <Field label="Insight" hint="The one thing to remember about this problem.">
            <Input placeholder="Store what you've seen in a hash map" />
          </Field>
          <Field label="Approach" error="Write at least a few words.">
            <Textarea rows={3} />
          </Field>
          <Field label="Language">
            <Select
              options={[
                { value: "cpp", label: "C++" },
                { value: "java", label: "Java" },
                { value: "python", label: "Python" },
              ]}
            />
          </Field>
          <Switch
            label="Start the timer on the first keystroke"
            description="A description under the label."
            checked={switchOn}
            onChange={setSwitchOn}
          />
          <Slider
            label="Problems and theory"
            value={slider}
            min={0}
            max={100}
            step={10}
            onChange={setSlider}
            format={(v) => `${v}% problems`}
          />
          <MultiCombobox
            label="Patterns"
            options={COMBO_OPTIONS}
            value={picked}
            onChange={setPicked}
            max={3}
            placeholder="Search patterns"
          />
        </Demo>

        <Demo title="Timer, keys and floating layers">
          <div className="flex flex-wrap items-center gap-4">
            <Timer timer={timer} label="Attempt timer" />
            <span className="flex items-center gap-1 text-sm text-muted">
              <Kbd>{MOD_KEY}</Kbd>
              <Kbd>K</Kbd> opens search
            </span>
            <span className="text-sm text-muted">
              <CodeSpans text="Scope text with `inline code`, as in `std::vector`" />
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tooltip content="A tooltip">
              <Button>Hover me</Button>
            </Tooltip>
            <Popover
              label="Why this color?"
              renderTrigger={(props) => (
                <Button {...props} ref={props.ref}>
                  Popover
                </Button>
              )}
            >
              {() => (
                <div className="w-64 space-y-1 text-base">
                  <p className="font-semibold text-text">Why this color?</p>
                  <p className="text-muted">
                    Knowledge 0.72 from a quiz on 12 Sep. Review due in 3 days.
                  </p>
                </div>
              )}
            </Popover>
            <Menu
              label="Concept actions"
              renderTrigger={(props) => (
                <Button {...props} ref={props.ref}>
                  Menu
                </Button>
              )}
              items={[
                {
                  id: "studied",
                  label: "Mark as studied",
                  onSelect: () => toast("Marked as studied."),
                },
                { id: "quiz", label: "Quick quiz", onSelect: () => toast("Quiz.") },
                { id: "sep", kind: "separator" },
                {
                  id: "hide",
                  label: "Hide from map",
                  danger: true,
                  onSelect: () => toast("Hidden."),
                },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDialog(true)}>Dialog</Button>
            <Button onClick={() => setDrawer(true)}>Drawer</Button>
            <Button onClick={() => setSheet(true)}>Bottom sheet</Button>
            <Button
              onClick={() => toast("Attempt saved. Next review in 3 days.", { tone: "success" })}
            >
              Toast
            </Button>
            <Button
              onClick={() =>
                toast("Tag deleted.", {
                  action: { label: "Undo", onClick: () => toast("Tag restored.") },
                })
              }
            >
              Toast with undo
            </Button>
          </div>
        </Demo>

        <Demo title="Empty state, skeleton and notices">
          <EmptyState
            icon={Plus}
            title="No problems yet"
            compact
            actions={
              <Button size="sm" variant="primary">
                Add problem
              </Button>
            }
          >
            Add your first one by pasting a LeetCode link.
          </EmptyState>
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Callout title="Time for a backup">Your last backup was 9 days ago.</Callout>
          <Callout tone="warning">Saved in this browser only.</Callout>
        </Demo>

        <Demo title="Code view">
          <CodeView code={SAMPLE_CODE} language="cpp" lineNumbers markLines={[13]} />
        </Demo>
      </div>

      <div className="mt-6 grid gap-6">
        <Demo title="Markdown with math, tables and code">
          <Suspense fallback={<Loading />}>
            <MarkdownView>{SAMPLE_MARKDOWN}</MarkdownView>
          </Suspense>
        </Demo>
        <Demo title="Code editor">
          <Suspense fallback={<Loading />}>
            <CodeEditor
              value={code}
              onChange={setCode}
              language="cpp"
              label="Sample code"
              minHeight="220px"
            />
          </Suspense>
        </Demo>
        <Demo title="Diff between two attempts">
          <Suspense fallback={<Loading />}>
            <DiffView
              before={SAMPLE_CODE}
              after={SAMPLE_CODE_V2}
              language="cpp"
              beforeLabel="Attempt 1"
              afterLabel="Attempt 2"
            />
          </Suspense>
        </Demo>
        <Demo title="Charts">
          <Suspense fallback={<Loading />}>
            <Charts />
          </Suspense>
        </Demo>
      </div>

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="Save attempt"
        description="How did it go?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setDialog(false)}>
              Save attempt
            </Button>
          </>
        }
      >
        <div className="space-y-4 px-5 py-4">
          <Field label="Minutes">
            <Input type="number" defaultValue={25} />
          </Field>
          <Field label="Insight">
            <Input />
          </Field>
        </div>
      </Dialog>
      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Dijkstra's algorithm"
        description="DSA › Shortest paths"
        resizable
        storageKey="atlas.kitDrawer"
      >
        <div className="p-5 text-base text-muted">A resizable side drawer. Drag its left edge.</div>
      </Drawer>
      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Bottom sheet">
        <div className="px-4 pb-6 text-base text-muted">Drag the handle down to close.</div>
      </BottomSheet>
    </PageFrame>
  );
}
