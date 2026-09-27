// A mock interview (F15): the countdown, the phase stepper, the chat with the interviewer
// (streamed, with Stop) and, for coding, the editor beside it; for design, the design workspace.
// Every exchange is saved, so a reload mid-interview picks up where it was. "End interview" asks
// Claude for feedback (prompt 11), saved with the session; a coding round's code becomes an
// attempt with mode "mock". In copy prompt mode the interview runs in a claude.ai chat instead.
import { ArrowUp, CircleStop, Flag, MessagesSquare, RotateCcw } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { routeHref, useRoute } from "@/app/router";
import { PageFrame } from "@/app/shell/PageFrame";
import { PageHeader } from "@/app/shell/PageHeader";
import { Button } from "@/components/ui/Button";
import { normalizeLanguage } from "@/components/ui/code/languages";
import { cx } from "@/components/ui/cx";
import { Textarea } from "@/components/ui/Field";
import { useMediaQuery } from "@/components/ui/hooks";
import { Callout, EmptyState, PageSkeleton, Skeleton } from "@/components/ui/Misc";
import { Tabs } from "@/components/ui/Tabs";
import { formatClock } from "@/components/ui/timer";
import { seedProblemById } from "@/data/seed";
import { subjectById } from "@/data/syllabus";
import { mockFeedbackPrompt } from "@/lib/ai/prompts";
import type { MockFeedback } from "@/lib/ai/schemas";
import { currentPhase, MOCK_TYPES, stripNote, transcript } from "@/lib/mock/mock";
import { problemInfo, problemLabel } from "@/lib/problems/catalog";
import { RESULT_LABEL } from "@/lib/problems/progress";
import type { MockSession } from "@/lib/types";
import { useDesignStore } from "@/stores/designStore";
import {
  completeMock,
  endMock,
  resumeMock,
  setMockCode,
  setMockPhase,
  useMockStore,
} from "@/stores/mockStore";
import { useProblemStore } from "@/stores/problemStore";
import { promptEnv } from "../ai/gather";
import { AIErrorView, AIMarkdown, AIRunView, ClaudeTag, StopButton, Thinking } from "../ai/parts";
import { useAIRequest } from "../ai/useAI";
import { DesignWorkspace } from "../designs/DesignWorkspace";
import { designSectionsFor, languageLabel, questionText } from "./context";
import { CopyMock } from "./CopyMock";
import { FeedbackView } from "./FeedbackView";
import { OPENING, useMockInterview } from "./useMockInterview";

const CodeEditor = lazy(() => import("@/components/ui/code/CodeEditor"));

function PhaseStepper({ session, disabled }: { session: MockSession; disabled: boolean }) {
  const phases = MOCK_TYPES[session.kind].phases;
  const current = currentPhase(session);
  const at = phases.indexOf(current);
  return (
    <ol aria-label="Interview phases" className="flex flex-wrap items-center gap-1">
      {phases.map((p, i) => (
        <li key={p}>
          <button
            type="button"
            disabled={disabled}
            aria-current={p === current ? "step" : undefined}
            onClick={() => setMockPhase(session.id, p)}
            className={cx(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-sm transition-colors max-md:h-9",
              p === current
                ? "border-accent bg-accent-soft font-medium text-text"
                : i < at
                  ? "border-rule text-muted hover:border-rule-strong"
                  : "border-dashed border-rule-strong text-muted hover:text-text",
              disabled && "cursor-default opacity-70",
            )}
          >
            <span className="tabular-nums" aria-hidden="true">
              {i + 1}
            </span>
            {p}
          </button>
        </li>
      ))}
    </ol>
  );
}

function Chat({
  session,
  interview,
}: {
  session: MockSession;
  interview: ReturnType<typeof useMockInterview>;
}) {
  const [text, setText] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const { pending, error, busy, live, started, unanswered } = interview;

  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [session.turns.length, pending?.text]);

  const send = () => {
    if (!text.trim()) return;
    interview.send(text);
    setText("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <section
      aria-label="Interview chat"
      className="flex min-h-0 flex-col rounded-panel border border-rule bg-surface"
    >
      <div
        ref={list}
        className="min-h-60 flex-1 space-y-4 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-busy={busy}
      >
        {!started && live && (
          <div className="space-y-3">
            <p className="text-base text-muted">
              The interviewer opens, then you talk it through in the box below. Your messages carry
              the phase and the time left, so the interviewer paces the interview and wraps up near
              the end.
            </p>
            <Button variant="primary" onClick={interview.begin} disabled={busy}>
              Start the interview
            </Button>
          </div>
        )}
        {session.turns.map((t, i) =>
          t.role === "assistant" ? (
            <div key={i} className="max-w-[70ch]">
              <p className="mb-1 flex items-center gap-2 text-sm font-medium text-muted">
                Interviewer <ClaudeTag />
              </p>
              <AIMarkdown compact>{t.content}</AIMarkdown>
            </div>
          ) : (
            <div key={i} className="ml-auto max-w-[85%] rounded-panel bg-accent-soft px-3 py-2">
              <p className="mb-0.5 text-xs font-medium text-muted">You</p>
              <p className="text-base whitespace-pre-wrap text-text">
                {stripNote(t.content) === OPENING ? "Ready to begin." : stripNote(t.content)}
              </p>
            </div>
          ),
        )}
        {pending && (
          <div className="max-w-[70ch]">
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-muted">
              Interviewer <ClaudeTag />
            </p>
            {pending.phase === "thinking" ? (
              <Thinking mode={pending.mode} />
            ) : (
              <AIMarkdown compact>{pending.text}</AIMarkdown>
            )}
            {pending.mode !== "copy" && <StopButton onStop={interview.stop} className="mt-1" />}
          </div>
        )}
        {error && (
          <AIErrorView
            state={{ phase: "error", text: "", mode: pending?.mode ?? "copy", error }}
            onRetry={() => void interview.retry()}
          />
        )}
        {!error && unanswered && live && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            The interviewer hasn't replied to your last message.
            <Button
              size="sm"
              variant="ghost"
              icon={RotateCcw}
              onClick={() => void interview.retry()}
            >
              Ask for the reply
            </Button>
          </div>
        )}
        {interview.trimmed && (
          <p className="text-xs text-muted">
            Older messages were shortened to fit what Claude can read at once.
          </p>
        )}
      </div>
      {live && started && (
        <div className="border-t border-rule p-3">
          <label htmlFor={`mock-input-${session.id}`} className="sr-only">
            Your answer
          </label>
          <div className="flex items-end gap-2">
            <Textarea
              id={`mock-input-${session.id}`}
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Think out loud: your questions, your approach, what you're checking."
              className="min-h-16 flex-1"
            />
            <Button
              variant="primary"
              icon={ArrowUp}
              onClick={send}
              disabled={busy || !text.trim()}
              aria-label="Send"
            >
              <span className="max-sm:sr-only">Send</span>
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted">Enter sends, Shift+Enter adds a line.</p>
        </div>
      )}
    </section>
  );
}

function CodePane({ session, disabled }: { session: MockSession; disabled: boolean }) {
  const [code, setCode] = useState(session.code ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(code);
  useEffect(() => {
    latest.current = code;
  });
  useEffect(() => {
    const id = session.id;
    const flush = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        setMockCode(id, latest.current);
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [session.id]);
  return (
    <section
      aria-label="Your code"
      className="flex min-h-0 flex-col overflow-hidden rounded-panel border border-rule bg-code"
    >
      <div className="flex items-center justify-between border-b border-rule bg-surface px-3 py-2 text-sm text-muted">
        <span>{languageLabel(session.language)}</span>
        <span>Saved as you type</span>
      </div>
      <div className="min-h-[360px] flex-1">
        <Suspense fallback={<Skeleton className="h-full w-full rounded-none" />}>
          <CodeEditor
            value={code}
            onChange={(v) => {
              setCode(v);
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => {
                timer.current = null;
                setMockCode(session.id, v);
              }, 1500);
            }}
            language={normalizeLanguage(session.language ?? "cpp")}
            label="Your code for the interview"
            readOnly={disabled}
            placeholder="Your code goes here."
            height="100%"
            minHeight="100%"
            className="h-full rounded-none border-0"
          />
        </Suspense>
      </div>
    </section>
  );
}

function Workspace({
  session,
  interview,
}: {
  session: MockSession;
  interview: ReturnType<typeof useMockInterview>;
}) {
  const wide = useMediaQuery("(min-width: 1024px)");
  const [tab, setTab] = useState<"chat" | "work">("chat");
  const design = useDesignStore((s) =>
    session.designAttemptId ? s.attempts[session.designAttemptId] : undefined,
  );
  const problem = session.topicOrProblemId
    ? seedProblemById.get(session.topicOrProblemId)
    : undefined;
  const chat = <Chat session={session} interview={interview} />;
  const second =
    session.kind === "dsa" ? (
      <CodePane session={session} disabled={!interview.live} />
    ) : session.kind === "design" && design && problem ? (
      <DesignWorkspace
        problem={problem}
        attempt={design}
        onSaved={() => undefined}
        hideReview
        stage="write"
        clock={false}
      />
    ) : null;
  if (!second) return <div className="max-w-3xl">{chat}</div>;
  if (wide)
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4">
        <div className="flex h-[calc(100vh-18.5rem)] min-h-[520px] flex-col">{chat}</div>
        <div
          className={cx(
            session.kind === "dsa" && "flex h-[calc(100vh-18.5rem)] min-h-[520px] flex-col",
          )}
        >
          {second}
        </div>
      </div>
    );
  return (
    <Tabs<"chat" | "work">
      label="Interview"
      value={tab}
      onChange={setTab}
      className="space-y-3"
      items={[
        { value: "chat", label: "Chat" },
        { value: "work", label: session.kind === "dsa" ? "Code" : "Design" },
      ]}
    >
      {(t) => (t === "chat" ? <div className="flex h-[65vh] flex-col">{chat}</div> : second)}
    </Tabs>
  );
}

function Live({ session }: { session: MockSession }) {
  const interview = useMockInterview(session);
  const feedback = useAIRequest<MockFeedback>();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const info = MOCK_TYPES[session.kind];
  const ended = Boolean(session.endedAt);

  const askFeedback = () =>
    void feedback.start(
      () => ({
        spec: mockFeedbackPrompt(
          promptEnv(),
          session.kind,
          transcript(useMockStore.getState().sessions[session.id] ?? session, {
            design: designSectionsFor(session),
          }),
        ),
      }),
      {
        title: `Feedback on my ${info.label.toLowerCase()}`,
        onDone: (result) => {
          if (result.data) completeMock(session.id, result.data);
        },
      },
    );

  const end = () => {
    setConfirmEnd(false);
    interview.stop();
    endMock(session.id, interview.elapsedMs);
    askFeedback();
  };

  const timeUp = interview.remaining <= 0 && !ended;
  return (
    <div className="space-y-4">
      <div className="sticky top-2 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-panel border border-rule bg-surface/95 px-3 py-2 backdrop-blur">
        <span
          role="timer"
          aria-label="Time left in the interview"
          className={cx(
            "text-lg font-semibold tabular-nums",
            interview.remaining < 5 * 60_000 ? "text-warning" : "text-text",
          )}
        >
          {formatClock(interview.remaining)}
        </span>
        <div className="order-last w-full md:order-none md:w-auto">
          <PhaseStepper session={session} disabled={ended} />
        </div>
        {!ended && (
          <Button
            size="sm"
            icon={Flag}
            onClick={() => setConfirmEnd(true)}
            disabled={!interview.started}
            className="ml-auto"
          >
            End interview
          </Button>
        )}
      </div>
      {confirmEnd && (
        <Callout
          tone="info"
          title="End the interview and get feedback?"
          actions={
            <>
              <Button size="sm" variant="ghost" onClick={() => setConfirmEnd(false)}>
                Keep going
              </Button>
              <Button size="sm" variant="primary" icon={CircleStop} onClick={end}>
                End and get feedback
              </Button>
            </>
          }
        >
          The interviewer scores it like a hiring committee would, with what to work on.
        </Callout>
      )}
      {timeUp && !confirmEnd && (
        <Callout
          tone="warning"
          title="Time is up"
          actions={
            <Button size="sm" variant="primary" icon={CircleStop} onClick={end}>
              End and get feedback
            </Button>
          }
        >
          Finish your sentence, then end the interview for your feedback.
        </Callout>
      )}
      {ended && !session.feedback && (
        <section
          aria-label="Feedback request"
          className="space-y-3 rounded-panel border border-rule bg-surface p-4"
        >
          {feedback.state.phase === "idle" ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base text-text">The interview has ended.</p>
              <Button variant="primary" onClick={askFeedback}>
                Get feedback
              </Button>
              <Button variant="ghost" onClick={() => resumeMock(session.id)}>
                Go back to the interview
              </Button>
            </div>
          ) : (
            <AIRunView
              request={feedback}
              showStream={false}
              thinkingLabel="The interviewer is writing your feedback…"
            />
          )}
        </section>
      )}
      <Workspace session={session} interview={interview} />
    </div>
  );
}

function Finished({ session }: { session: MockSession }) {
  const states = useProblemStore((s) => s.states);
  const info = session.topicOrProblemId
    ? problemInfo(session.topicOrProblemId, states[session.topicOrProblemId])
    : undefined;
  const attempt = session.attemptId
    ? states[session.topicOrProblemId ?? ""]?.attempts.find((a) => a.id === session.attemptId)
    : undefined;
  return (
    <div className="space-y-6">
      <div className="rounded-panel border border-rule bg-surface p-4 sm:p-5">
        <FeedbackView feedback={session.feedback!} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-base text-muted">
        {session.kind === "dsa" && info && (
          <span>
            The problem:{" "}
            <a href={routeHref("/problems", info.id)} className="text-accent hover:underline">
              {problemLabel(info)}
            </a>
            {attempt?.result &&
              `. Your code is saved as a mock attempt (${RESULT_LABEL[attempt.result].toLowerCase()}).`}
          </span>
        )}
        {session.kind === "design" && info && (
          <span>
            Your design is kept with{" "}
            <a href={routeHref("/designs", info.id)} className="text-accent hover:underline">
              {info.title}
            </a>
            .
          </span>
        )}
        {session.kind === "theory" && session.subjects?.length ? (
          <span>
            Subjects: {session.subjects.map((s) => subjectById.get(s)?.name ?? s).join(", ")}
          </span>
        ) : null}
      </div>
      {session.turns.length > 0 && (
        <details className="rounded-panel border border-rule bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-base font-medium text-text">
            The conversation ({session.turns.length} messages)
          </summary>
          <div className="space-y-3 border-t border-rule px-4 py-4">
            {session.turns.map((t, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-muted">
                  {t.role === "assistant" ? "Interviewer" : "You"}
                </p>
                {t.role === "assistant" ? (
                  <AIMarkdown compact>{t.content}</AIMarkdown>
                ) : (
                  <p className="text-base whitespace-pre-wrap text-text">{stripNote(t.content)}</p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
      {session.kind === "dsa" && session.code?.trim() && (
        <details className="rounded-panel border border-rule bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-base font-medium text-text">
            Your code
          </summary>
          <pre className="overflow-x-auto border-t border-rule bg-code p-4 font-mono text-sm text-text">
            {session.code}
          </pre>
        </details>
      )}
      <Button href="#/mock" variant="primary">
        Start another mock
      </Button>
    </div>
  );
}

export default function MockSessionPage() {
  const route = useRoute();
  const loaded = useMockStore((s) => s.loaded);
  const session = useMockStore((s) => (route.id ? s.sessions[route.id] : undefined));
  const designsLoaded = useDesignStore((s) => s.loaded);
  const subtitle = useMemo(() => {
    if (!session) return null;
    if (session.kind === "theory")
      return `Subjects: ${(session.subjects ?? []).map((s) => subjectById.get(s)?.name ?? s).join(", ")}.`;
    if (session.kind === "behavioral")
      return `${session.questionIds?.length ?? 0} questions from the bank, starting with “${questionText(session.questionIds?.[0] ?? "")}”.`;
    if (session.kind === "design") {
      const p = session.topicOrProblemId
        ? seedProblemById.get(session.topicOrProblemId)
        : undefined;
      return p ? `${p.title}: ${p.prompt}` : null;
    }
    // Coding: the interviewer states the problem; its name shows after the interview.
    return session.feedback
      ? null
      : `You code in ${languageLabel(session.language)}. The interviewer states the problem in their own words.`;
  }, [session]);

  if (!loaded || !designsLoaded)
    return (
      <PageFrame>
        <PageSkeleton />
      </PageFrame>
    );
  if (!session)
    return (
      <PageFrame>
        <PageHeader eyebrow="Mock interview" title="Mock interview" />
        <EmptyState
          icon={MessagesSquare}
          title="This interview isn't here"
          actions={
            <Button href="#/mock" variant="primary">
              Start a mock interview
            </Button>
          }
        >
          It may have been discarded, or it was started on another device that hasn't synced yet.
        </EmptyState>
      </PageFrame>
    );
  const info = MOCK_TYPES[session.kind];
  return (
    <PageFrame className="max-w-7xl">
      <PageHeader
        eyebrow="Mock interview"
        title={info.label}
        description={subtitle ?? undefined}
        actions={
          <Button href={routeHref("/mock", undefined, { tab: "history" })} variant="ghost">
            All mocks
          </Button>
        }
      />
      {session.feedback ? (
        <Finished session={session} />
      ) : session.delivery === "copy" ? (
        <CopyMock session={session} />
      ) : (
        <Live session={session} />
      )}
    </PageFrame>
  );
}
