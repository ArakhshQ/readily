"use client";

// Shared frame for the writing tools (grammar checker, paraphraser): paste text or
// open a file, see the cost, run, and get the result to copy or download.
import { useRef, useState } from "react";
import { useAccess } from "../Access";
import { Progress } from "../Message";
import { ResultPanel } from "../ResultPanel";
import { ToolErrorMessage } from "../ToolErrorMessage";
import { useRun } from "../useRun";
import type { AiResult } from "@/lib/ai-client";
import { formatBytes, type Output } from "@/lib/files";
import type { ToolSlug } from "@/lib/tools";

/** Characters per credit for the writing tools (about 400 words). */
export const WRITING_CHARS_PER_CREDIT = 2500;

export function TextAiTool(props: {
  slug: ToolSlug;
  maxChars: number;
  options?: React.ReactNode;
  payload?: Record<string, unknown>;
  actionLabel: string;
  busyLabel: string;
  resultName: string;
  /** Extra content above the downloads (e.g. the list of grammar fixes). */
  extra?: (res: AiResult) => React.ReactNode;
  checks: (res: AiResult) => string[];
  next: ToolSlug[];
}) {
  const access = useAccess();
  const r = useRun();
  const [text, setText] = useState("");
  const [res, setRes] = useState<AiResult | null>(null);
  const [opening, setOpening] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const chars = text.trim().length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const cost = Math.max(1, Math.ceil(chars / WRITING_CHARS_PER_CREDIT));
  const tooLong = chars > props.maxChars;
  const short = (access.gate.kind === "plan" || access.gate.kind === "trial") && cost > access.credits;
  const ok = chars >= 3 && !tooLong && !short;

  async function openFile(file: File) {
    setOpening(true);
    r.reset();
    try {
      const { documentText } = await import("@/lib/ai-tools");
      const doc = await documentText(file);
      const clean = doc.text.replace(/\[Page \d+\]\n?/g, "").trim();
      if (!clean) throw new Error("This file has no text to read. If it's a scan, run it through Scan to searchable PDF first.");
      setText(clean.slice(0, props.maxChars));
      if (clean.length > props.maxChars) r.setError(`Only the first ${props.maxChars.toLocaleString("en-US")} characters were loaded. Do the rest in another round.`);
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "This file couldn't be read.");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="workspace">
      <div className="options">
        <div className="field">
          <div className="field-row">
            <label className="field-label" htmlFor="wtext">
              Your text
            </label>
            <button type="button" className="link-btn" onClick={() => fileInput.current?.click()} disabled={opening}>
              {opening ? "Opening…" : "Open a TXT or PDF file"}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".txt,.md,.pdf,text/plain,application/pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) openFile(f);
                e.target.value = "";
              }}
            />
          </div>
          <textarea
            id="wtext"
            className="input writing-input"
            rows={10}
            value={text}
            onChange={(e) => (setText(e.target.value), r.reset(), setRes(null))}
            placeholder="Type or paste your text here."
          />
          <p className={`hint${tooLong ? " hint-bad" : ""}`}>
            {words.toLocaleString("en-US")} words · {chars.toLocaleString("en-US")} / {props.maxChars.toLocaleString("en-US")} characters
            {tooLong ? ". Shorten it or do it in parts." : ""}
          </p>
        </div>
        {props.options}
      </div>
      {!r.outputs && (
        <div className="action-bar">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!ok || r.busy}
            onClick={async () => {
              if (!(await access.allow())) return;
              setRes(null);
              r.run(async (report) => {
                const { serverRun, creditNote, textToDocx } = await import("@/lib/ai-tools");
                const out = await serverRun(props.slug, { payload: { text: text.trim(), ...(props.payload ?? {}) } }, report, props.busyLabel);
                if (out.credits_left !== undefined) access.setCredits(out.credits_left);
                const result = (out.text ?? "").trim();
                if (!result) throw new Error("The AI returned nothing. Your credits were refunded if it failed. Try again.");
                setRes(out);
                const rtl = /[֐-ࣿ]/.test(result.slice(0, 400));
                const txt = new Blob([result], { type: "text/plain;charset=utf-8" });
                const docx = await textToDocx(result, props.resultName, rtl);
                const checks = [...props.checks(out), creditNote(out)];
                const outputs: Output[] = [
                  { blob: txt, name: `${props.resultName}.txt`, checks, preview: result },
                  { blob: docx, name: `${props.resultName}.docx`, checks: ["Word document", formatBytes(docx.size)] },
                ];
                return outputs;
              });
            }}
          >
            {r.busy ? props.busyLabel : props.actionLabel}
          </button>
          <span className="summary">
            {short ? `This needs ${cost} credits and you have ${access.credits}.` : chars >= 3 ? `About ${cost} ${cost === 1 ? "credit" : "credits"}` : "Paste some text"}
          </span>
        </div>
      )}
      {r.busy && <Progress value={r.progress} label={r.status || props.busyLabel} />}
      {r.error && <ToolErrorMessage text={r.error} />}
      {r.outputs && res && props.extra?.(res)}
      {r.outputs && (
        <ResultPanel
          tool={props.slug}
          outputs={r.outputs}
          zipName={`readily-${props.slug}.zip`}
          next={props.next}
          onRestart={() => (r.reset(), setRes(null))}
        />
      )}
    </div>
  );
}
