"use client";

import { useEffect, useState } from "react";
import { useAccess } from "../Access";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import type { Step } from "@/lib/assistant";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG.assistant;
const EXAMPLES = ["These scans as one PDF under 2 MB", "Make every photo 1080 pixels wide and under 300 KB", "Join these PDFs and number the pages", "Turn my iPhone photos into JPG"];

export default function Assistant() {
  const f = useFiles("any", true);
  const r = useRun();
  const access = useAccess();
  const [text, setText] = useState("");
  const [plan, setPlan] = useState<{ steps: Step[]; reply: string; left?: number } | null>(null);
  const [planning, setPlanning] = useState(false);
  const { reset } = r;
  useEffect(() => reset(), [f.items, reset]);
  useEffect(() => setPlan(null), [text, f.items]);
  const n = f.items.length;

  async function makePlan() {
    if (!(await access.allow())) return;
    setPlanning(true);
    r.setError(null);
    try {
      const { planCommand } = await import("@/lib/ai-client");
      const res = await planCommand(text, f.items.map((i) => ({ name: i.file.name, type: i.file.type, size: i.file.size })));
      setPlan({ steps: res.steps as Step[], reply: res.reply, left: res.commands_left });
      if (!res.steps.length) r.setError(res.reply || "That can't be done with Readily's tools yet.");
    } catch (e) {
      r.setError(e instanceof Error ? e.message : "The assistant couldn't plan that.");
    } finally {
      setPlanning(false);
    }
  }

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder
      listHeading={n === 1 ? "Your file" : `Your files, in order (${n})`}
      options={
        <div className="field">
          <label className="field-label" htmlFor="ask">
            What do you need?
          </label>
          <textarea id="ask" className="input" rows={2} maxLength={1000} value={text} placeholder={EXAMPLES[0]} onChange={(e) => setText(e.target.value)} />
          <div className="chips">
            {EXAMPLES.map((x) => (
              <button key={x} type="button" className="chip" onClick={() => setText(x)}>
                {x}
              </button>
            ))}
          </div>
          {plan && plan.steps.length > 0 && (
            <div className="plan-steps">
              <p>{plan.reply}</p>
              <ol>
                {plan.steps.map((s, i) => (
                  <li key={i}>{(STEP_TEXT[s.op] ?? s.op) + detail(s)}</li>
                ))}
              </ol>
              {plan.left !== undefined && <p className="hint">{plan.left} commands left this month.</p>}
            </div>
          )}
        </div>
      }
      actionLabel={plan?.steps.length ? "Run these steps" : planning ? "Planning…" : "Plan it"}
      busyLabel="Working"
      canRun={n > 0 && text.trim().length > 3 && !planning}
      blockedReason={n === 0 ? "Add your files" : text.trim().length <= 3 ? "Say what you need" : undefined}
      onRun={() => {
        if (!plan?.steps.length) return void makePlan();
        r.run(async (report) => {
          const { runSteps } = await import("@/lib/assistant");
          return runSteps(
            f.items.map((i) => i.file),
            plan.steps,
            report,
          );
        });
      }}
      zipName="readily-files.zip"
      next={["compress-pdf", "compress-image"]}
      onRestart={() => {
        f.setItems([]);
        setText("");
        r.reset();
      }}
    />
  );
}

const STEP_TEXT: Record<string, string> = {
  images_to_pdf: "Put the images into one PDF",
  merge_pdfs: "Join the PDFs",
  compress_pdf: "Compress the PDF",
  pdf_under_size: "Shrink the PDF under",
  compress_image: "Shrink each image under",
  resize_image: "Resize the images to",
  convert_image: "Convert the images to",
  heic_to_jpg: "Turn iPhone photos into JPG",
  split_pdf: "Take out pages",
  pdf_to_images: "Turn the pages into images",
  rotate_pdf: "Rotate the pages",
  add_page_numbers: "Number the pages",
  rename: "Name it",
};
function detail(s: Step): string {
  if (s.op === "pdf_under_size" || s.op === "compress_image") return ` ${s.target_kb >= 1000 ? `${s.target_kb / 1000} MB` : `${s.target_kb} KB`}`;
  if (s.op === "resize_image") return ` ${s.width ?? "auto"} × ${s.height ?? "auto"}`;
  if (s.op === "convert_image") return ` ${s.format.toUpperCase()}`;
  if (s.op === "split_pdf") return ` ${s.ranges}`;
  if (s.op === "rotate_pdf") return ` ${s.degrees}°`;
  if (s.op === "rename") return ` “${s.name}”`;
  return "";
}
