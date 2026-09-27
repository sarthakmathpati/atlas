// The sketch's text box and its diagram (F26). The diagram redraws a moment after typing stops;
// lines Atlas can't read are listed with their line number and what to write instead (clicking
// one selects that line), and every line that parses is still drawn.
import { CircleAlert } from "lucide-react";
import {
  lazy,
  Suspense,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMediaQuery } from "@/components/ui/hooks";
import { Skeleton } from "@/components/ui/Misc";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Textarea } from "@/components/ui/Field";
import { bestDirection, parseSketch, SKETCH_EXAMPLE, type Direction } from "@/lib/designs/sketch";

const SketchView = lazy(() => import("./SketchView"));

const SAVE_AFTER_MS = 600;

/** An error message with its arrows kept on one line (as code). */
function Message({ text }: { text: string }) {
  return (
    <>
      {text.split(/(<->|-->|<--|->|<-|--)/).map((part, i) =>
        i % 2 ? (
          <code key={i} className="font-mono whitespace-nowrap">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function SketchEditor({
  value,
  onSave,
  label,
  hint,
  readOnly,
}: {
  value: string;
  onSave: (value: string) => void;
  label: string;
  hint: string;
  readOnly?: boolean;
}) {
  const id = useId();
  const wide = useMediaQuery("(min-width: 768px)");
  const [direction, setDirection] = useState<Direction | null>(null);
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  // Typing not saved yet (outside changes wait until it is).
  const [dirty, setDirty] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const deferred = useDeferredValue(text);
  const parsed = useMemo(() => parseSketch(deferred), [deferred]);
  // Until the owner picks one, the direction that shows the diagram largest.
  const auto = useMemo(
    () => bestDirection(parsed, wide ? { width: 1000, height: 380 } : { width: 330, height: 340 }),
    [parsed, wide],
  );
  const dir: Direction = direction ?? auto;

  if (value !== synced && !dirty) {
    setSynced(value);
    setText(value);
  }

  const latest = useRef({ text, onSave });
  useEffect(() => {
    latest.current = { text, onSave };
  });
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        latest.current.onSave(latest.current.text);
      }
    },
    [],
  );

  const change = (v: string) => {
    setText(v);
    setSynced(v);
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setDirty(false);
      latest.current.onSave(latest.current.text);
    }, SAVE_AFTER_MS);
  };

  const selectLine = (line: number) => {
    const el = area.current;
    if (!el || line < 1) return;
    const lines = text.split("\n");
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    el.focus();
    el.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
        </label>
        <Textarea
          ref={area}
          id={id}
          rows={7}
          value={text}
          readOnly={readOnly}
          spellCheck={false}
          onChange={(e) => change(e.target.value)}
          placeholder={SKETCH_EXAMPLE}
          aria-describedby={`${id}-hint`}
          className="font-mono text-sm"
        />
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint} Arrows: <code className="font-mono">-&gt;</code>,{" "}
          <code className="font-mono">&lt;-</code>, <code className="font-mono">&lt;-&gt;</code>,{" "}
          <code className="font-mono">--&gt;</code> (dashed, for events) and{" "}
          <code className="font-mono">--</code>. A kind in brackets sets the shape:{" "}
          <code className="font-mono">Orders DB [db]</code>.
        </p>
      </div>
      {parsed.errors.length > 0 && (
        <ul
          aria-label="Lines to fix"
          className="space-y-1 rounded-control border border-rule bg-warning-soft px-3 py-2"
        >
          {parsed.errors.map((e, i) => (
            <li key={`${e.line}-${i}`} className="flex gap-2 text-sm text-text">
              <CircleAlert size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" />
              <span>
                {e.line > 0 ? (
                  <button
                    type="button"
                    onClick={() => selectLine(e.line)}
                    className="font-medium text-accent hover:underline"
                  >
                    Line {e.line}
                  </button>
                ) : (
                  <span className="font-medium">The sketch</span>
                )}
                : <Message text={e.message} />
              </span>
            </li>
          ))}
        </ul>
      )}
      {parsed.nodes.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              {parsed.nodes.length} {parsed.nodes.length === 1 ? "box" : "boxes"},{" "}
              {parsed.edges.length} {parsed.edges.length === 1 ? "arrow" : "arrows"}
            </p>
            <SegmentedControl<Direction>
              label="Diagram direction"
              size="sm"
              value={dir}
              onChange={setDirection}
              options={[
                { value: "LR", label: "Left to right" },
                { value: "TB", label: "Top to bottom" },
              ]}
            />
          </div>
          <Suspense fallback={<Skeleton className="h-[360px] w-full" />}>
            <SketchView sketch={parsed} direction={dir} height={wide ? 460 : 400} />
          </Suspense>
        </div>
      ) : (
        !parsed.errors.length && (
          <p className="rounded-control border border-dashed border-rule-strong px-3 py-6 text-center text-sm text-muted">
            Your diagram appears here as you write lines like “Client -&gt; API Gateway : HTTPS”.
          </p>
        )
      )}
    </div>
  );
}
