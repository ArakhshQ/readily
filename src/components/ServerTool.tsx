"use client";

// The shared frame for AI tools that run on Readily's servers: pick a file, see
// what it will cost in credits, run, and get the result. Each tool supplies how to
// prepare its file, its options, and how to turn the answer into downloads.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccess } from "./Access";
import { useFiles } from "./useFiles";
import { useRun } from "./useRun";
import { Workspace } from "./Workspace";
import type { AiResult } from "@/lib/ai-client";
import { formatTime, type Output } from "@/lib/files";
import { probe } from "@/lib/media";
import type { Report } from "@/lib/ai-tools";
import type { InputKind, ToolSlug } from "@/lib/tools";

export interface Measure {
  minutes: number;
  pages: number;
  count: number;
}

interface Props {
  slug: ToolSlug;
  input: InputKind;
  /** Longest input in minutes (audio and video tools). */
  maxMinutes?: number;
  /** Premium "best quality" mode switched on. */
  best?: boolean;
  options?: React.ReactNode;
  /** Extra condition before the button is enabled, with the reason when it isn't. */
  ready?: { ok: boolean; why?: string };
  actionLabel: string;
  busyLabel: string;
  /** Measures the file for the credit estimate (pages for documents). */
  measure?: (file: File) => Promise<Partial<Measure>>;
  /** Does the whole job and returns the downloads. */
  work: (file: File, m: Measure, report: Report) => Promise<{ outputs: Output[]; res?: AiResult }>;
  next: ToolSlug[];
  /** Extra things to reset the result for. */
  deps?: unknown[];
}

export function estimate(slug: ToolSlug, credits: number, unit: string | undefined, m: Measure): number {
  if (!credits) return 0;
  if (unit === "minute") return Math.max(1, Math.ceil(m.minutes)) * credits;
  if (unit === "page") return Math.max(1, m.pages) * credits;
  if (unit === "document" || unit === "question") return Math.max(1, Math.ceil(m.pages / 40)) * credits;
  void slug;
  return credits * Math.max(1, m.count);
}

export function ServerTool(p: Props) {
  const access = useAccess();
  const { tool } = access;
  const f = useFiles(p.input, false);
  const r = useRun();
  const [m, setM] = useState<Measure>({ minutes: 0, pages: 0, count: 1 });
  const [measuring, setMeasuring] = useState(false);
  const item = f.items[0];
  const { setDetail } = f;

  useEffect(() => {
    setM({ minutes: 0, pages: 0, count: 1 });
    if (!item) return;
    let gone = false;
    (async () => {
      setMeasuring(true);
      try {
        const next: Measure = { minutes: 0, pages: 0, count: 1 };
        if (p.input === "media" || p.input === "video" || p.input === "audio") {
          const pr = await probe(item.file);
          next.minutes = pr.duration / 60;
          if (pr.duration) setDetail(item.id, formatTime(pr.duration));
        }
        if (p.measure) Object.assign(next, await p.measure(item.file));
        if (!gone) setM(next);
      } catch (e) {
        if (!gone) r.setError(e instanceof Error ? e.message : "This file couldn't be read.");
      } finally {
        if (!gone) setMeasuring(false);
      }
    })();
    return () => {
      gone = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const { reset } = r;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => reset(), [f.items, reset, ...(p.deps ?? [])]);

  const per = p.best && tool.premiumOption ? tool.premiumOption.credits : (tool.credits ?? 0);
  const cost = estimate(p.slug, per, tool.unit, m);
  const tooLong = !!p.maxMinutes && m.minutes > p.maxMinutes;
  const short = access.gate.kind === "plan" || access.gate.kind === "trial" ? cost > access.credits : false;

  let why: string | undefined;
  if (measuring) why = "Reading the file…";
  else if (tooLong) why = `Up to ${p.maxMinutes} minutes at a time. Trim it first.`;
  else if (p.ready && !p.ready.ok) why = p.ready.why;
  else if (short) why = `This needs ${cost} credits and you have ${access.credits}.`;

  const summary = cost ? `About ${cost} ${cost === 1 ? "credit" : "credits"}` : undefined;

  return (
    <>
      <Workspace
        tool={tool}
        {...f}
        {...r}
        listHeading="Your file"
        options={p.options}
        actionLabel={p.actionLabel}
        busyLabel={p.busyLabel}
        canRun={!!item && !measuring && !tooLong && (p.ready?.ok ?? true) && !short}
        blockedReason={why}
        summary={summary}
        onRun={async () => {
          if (!(await access.allow())) return;
          r.run(async (report) => {
            const { outputs, res } = await p.work(item.file, m, report);
            if (res?.credits_left !== undefined) access.setCredits(res.credits_left);
            else access.refresh().catch(() => {});
            return outputs;
          });
        }}
        zipName={`readily-${p.slug}.zip`}
        next={p.next}
        onRestart={() => {
          f.setItems([]);
          r.reset();
        }}
      />
      {short && (
        <p className="hint" style={{ marginTop: 12 }}>
          <Link href="/pricing/">Get more credits with a bigger plan</Link>, or wait for your monthly refresh.
        </p>
      )}
    </>
  );
}
