// CSV import (F6): bring in history from another tracker. Choose or paste a file, check the
// preview (matched, new and skipped rows, with how each date and result was read), then import.
// Each row becomes an attempt without code; the problems' review schedules are rebuilt from it.
import { FileUp } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Select, Switch, Textarea } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Misc";
import { problemLabel } from "@/lib/problems/catalog";
import { planCsvImport, type CsvImportOptions } from "@/lib/problems/csv";
import { shortDate } from "@/lib/problems/progress";
import { applyCsvPlan, restoreSnapshot, useProblemStore } from "@/stores/problemStore";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { ResultLabel } from "./parts";

const EXAMPLE = `title,url,difficulty,date,result,minutes,notes
Two Sum,https://leetcode.com/problems/two-sum/,easy,2026-08-02,solved,12,hash map
Network Delay Time,,medium,2026-08-05,with hints,40,`;

export function CsvImportDialog() {
  const open = useUiStore((s) => s.csvImportOpen);
  const setOpen = useUiStore((s) => s.setCsvImportOpen);
  const states = useProblemStore((s) => s.states);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [step, setStep] = useState<"choose" | "preview">("choose");
  const [options, setOptions] = useState<CsvImportOptions>({
    monthFirst: false,
    defaultResult: "solved_alone",
    addUnmatched: true,
  });
  const [readError, setReadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Start fresh each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setText("");
      setFileName(null);
      setStep("choose");
      setReadError(null);
    }
  }

  const plan = useMemo(
    () => (step === "preview" ? planCsvImport(text, states, options) : null),
    [step, text, states, options],
  );
  const close = () => setOpen(false);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setReadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setFileName(file.name);
      setStep("preview");
    };
    reader.onerror = () => setReadError("Couldn't read that file. Try saving it again as CSV.");
    reader.readAsText(file);
  };

  const importNow = () => {
    if (!plan) return;
    const result = applyCsvPlan(plan, options);
    close();
    const parts = [
      `Imported ${result.attempts} ${result.attempts === 1 ? "attempt" : "attempts"} across ${result.problems} ${result.problems === 1 ? "problem" : "problems"}`,
    ];
    if (result.created) parts.push(`${result.created} added as your own`);
    if (result.duplicates) parts.push(`${result.duplicates} already there`);
    toast(`${parts.join(", ")}.`, {
      tone: "success",
      action: { label: "Undo", onClick: () => restoreSnapshot(result.snapshot) },
    });
  };

  const importable = plan ? plan.rows.filter((r) => r.status !== "skipped").length : 0;

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Import problems from CSV"
      description={
        step === "choose"
          ? "Bring in the problems you've already solved elsewhere."
          : fileName
            ? `Preview of ${fileName}`
            : "Preview"
      }
      size="lg"
      footer={
        step === "choose" ? (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!text.trim()} onClick={() => setStep("preview")}>
              Preview
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep("choose")}>
              Back
            </Button>
            <Button variant="primary" disabled={importable === 0} onClick={importNow}>
              Import {importable} {importable === 1 ? "row" : "rows"}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4 px-4 py-4 sm:px-5">
        {step === "choose" ? (
          <>
            <p className="text-base text-muted">
              Columns: <strong className="font-medium text-text">title</strong>,{" "}
              <strong className="font-medium text-text">url</strong>, difficulty, date, result,
              minutes and notes. Only a title or a url is required; the header names can vary
              (“Problem”, “Link”, “Solved on”, “Status”…). Rows are matched to the bank by LeetCode
              link, number or title.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv,.tsv,text/plain"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <Button icon={FileUp} onClick={() => fileRef.current?.click()}>
                Choose a CSV file
              </Button>
              <span className="text-sm text-muted">or paste it below</span>
            </div>
            {readError && <p className="text-sm text-danger">{readError}</p>}
            <Field label="CSV text" hideLabel>
              <Textarea
                rows={6}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setFileName(null);
                }}
                placeholder={EXAMPLE}
                className="font-mono text-sm"
                spellCheck={false}
              />
            </Field>
          </>
        ) : plan ? (
          <>
            {plan.missingColumns ? (
              <Callout tone="warning" title="No title or url column">
                The first line should name the columns, including “title” or “url”. Go back and
                check the file.
              </Callout>
            ) : (
              <p className="text-base text-text" role="status">
                {plan.matched} matched in the bank, {plan.added} new{" "}
                {plan.added === 1 ? "problem" : "problems"}, {plan.skipped} skipped.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Dates like 03/04/2026 mean">
                <Select
                  value={options.monthFirst ? "month" : "day"}
                  onChange={(e) =>
                    setOptions((o) => ({ ...o, monthFirst: e.target.value === "month" }))
                  }
                  options={[
                    { value: "day", label: "3 April (day first)" },
                    { value: "month", label: "March 4 (month first)" },
                  ]}
                />
              </Field>
              <Field label="Rows without a result count as">
                <Select
                  value={options.defaultResult}
                  onChange={(e) =>
                    setOptions((o) => ({
                      ...o,
                      defaultResult: e.target.value as CsvImportOptions["defaultResult"],
                    }))
                  }
                  options={[
                    { value: "solved_alone", label: "Solved alone" },
                    { value: "solved_with_hints", label: "Solved with hints" },
                  ]}
                />
              </Field>
            </div>
            <Switch
              label="Add unmatched rows as your own problems"
              description="Otherwise rows that match nothing in the bank are skipped."
              checked={options.addUnmatched}
              onChange={(addUnmatched) => setOptions((o) => ({ ...o, addUnmatched }))}
            />
            {plan.rows.length > 0 && (
              <div className="max-h-[42vh] overflow-auto rounded-control border border-rule">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-surface-sunken text-left text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Line
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Row
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Becomes
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Date
                      </th>
                      <th scope="col" className="px-3 py-2 font-medium">
                        Result
                      </th>
                      <th scope="col" className="px-3 py-2 text-right font-medium">
                        Min
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.rows.map((r) => (
                      <tr key={r.line} className="border-t border-rule align-top">
                        <td className="px-3 py-2 text-muted tabular-nums">{r.line}</td>
                        <td className="max-w-[200px] px-3 py-2 break-words text-text">
                          {r.title || r.url || "–"}
                        </td>
                        <td className="px-3 py-2">
                          {r.status === "matched" && r.match ? (
                            <span className="text-text">{problemLabel(r.match)}</span>
                          ) : r.status === "new" ? (
                            <span className="text-accent">New problem</span>
                          ) : (
                            <span className="text-muted">Skipped</span>
                          )}
                          {r.note && <span className="block text-xs text-warning">{r.note}</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted">
                          {r.date ? shortDate(r.date) : "Today"}
                        </td>
                        <td className="px-3 py-2">
                          {r.status === "skipped" ? (
                            "–"
                          ) : (
                            <span className={r.resultGiven ? "" : "opacity-70"}>
                              <ResultLabel result={r.result} short />
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-muted tabular-nums">
                          {r.minutes ?? "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-sm text-muted">
              Each row becomes an attempt without code, and review dates are worked out from the
              history. You can undo the import from the message that follows.
            </p>
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
