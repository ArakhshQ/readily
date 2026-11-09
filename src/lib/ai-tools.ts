// Shared steps for the AI tools: prepare the file on the device, send it, and turn
// the server's answer into downloadable results.
import { baseName, canvasToBlob, formatBytes, formatTime, isPdf, loadImage, type Output } from "./files";
import { fetchResult, runAi, uploadInput, type AiResult } from "./ai-client";

export type Report = (p: number, label?: string) => void;

// ---------------------------------------------------------------- documents

/** Text of a PDF (with [Page N] markers) or a text file. */
export async function documentText(file: File, report?: Report): Promise<{ text: string; pages: number }> {
  if (!isPdf(file)) {
    const text = (await file.text()).replace(/\r\n/g, "\n").trim();
    return { text, pages: Math.max(1, Math.ceil(text.length / 3000)) };
  }
  const { openPdf } = await import("./pdf-render");
  const doc = await openPdf(file);
  const parts: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    report?.((p - 1) / doc.numPages, `Reading page ${p} of ${doc.numPages}`);
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];
    for (const it of tc.items) {
      if (!("str" in it)) continue;
      const y = (it.transform as number[])[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trim());
        line = "";
      }
      line += it.str + (it.hasEOL ? "" : "");
      lastY = y;
    }
    if (line.trim()) lines.push(line.trim());
    parts.push(`[Page ${p}]\n${lines.filter(Boolean).join("\n")}`);
    page.cleanup();
  }
  const pages = doc.numPages;
  await doc.loadingTask.destroy();
  const text = parts.join("\n\n").trim();
  const realChars = text.replace(/\[Page \d+\]/g, "").replace(/\s/g, "").length;
  if (realChars < 30) {
    throw new Error("This PDF has almost no text, so it's probably a scan. Run it through Scan to searchable PDF first.");
  }
  return { text, pages };
}

/** Splits text at paragraph breaks into pieces no longer than `max` characters. */
export function chunkText(text: string, max: number): string[] {
  const paras = text.split(/\n{2,}/);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (p.length > max) {
      if (cur) out.push(cur);
      cur = "";
      for (let i = 0; i < p.length; i += max) out.push(p.slice(i, i + max));
      continue;
    }
    if ((cur ? cur.length + 2 : 0) + p.length > max) {
      out.push(cur);
      cur = p;
    } else cur = cur ? `${cur}\n\n${p}` : p;
  }
  if (cur) out.push(cur);
  return out.filter((c) => c.trim());
}

const RTL = /^(Persian|Dari|Arabic|Urdu|Pashto|Hebrew|Kurdish \(Sorani\)|Sindhi|Uyghur|Yiddish)/;
export const isRtlLanguage = (name: string) => RTL.test(name);

/** A simple Word document from plain text (headings kept as paragraphs). */
export async function textToDocx(text: string, title: string, rtl: boolean): Promise<Blob> {
  const D = await import("docx");
  const children = text.split(/\n{2,}/).map(
    (para) =>
      new D.Paragraph({
        bidirectional: rtl || undefined,
        children: para.split("\n").flatMap((line, i) => [
          ...(i > 0 ? [new D.TextRun({ text: "", break: 1 })] : []),
          new D.TextRun({ text: line.replace(/^#+\s*/, ""), bold: /^#+\s/.test(line) || undefined, rightToLeft: rtl || undefined }),
        ]),
      }),
  );
  const doc = new D.Document({ creator: "Readily", title, sections: [{ children }] });
  return D.Packer.toBlob(doc);
}

export function textOutput(text: string, name: string, checks: string[]): Output {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  return { blob, name, checks: [...checks, formatBytes(blob.size)], preview: text };
}

// ---------------------------------------------------------------- images

/** JPEG (or PNG when it has transparency) no bigger than maxSide, ready to send. */
export async function imageForUpload(file: File, maxSide: number): Promise<{ blob: Blob; ext: string; width: number; height: number }> {
  const img = await loadImage(file);
  const k = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * k));
  c.height = Math.max(1, Math.round(img.height * k));
  const ctx = c.getContext("2d")!;
  const png = file.type === "image/png";
  if (!png) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const blob = await canvasToBlob(c, png ? "image/png" : "image/jpeg", png ? undefined : 0.93);
  return { blob, ext: png ? "png" : "jpg", width: c.width, height: c.height };
}

// ---------------------------------------------------------------- running

/** Uploads (if there's a file), runs the AI tool and waits for the result. */
export async function serverRun(
  tool: string,
  input: { blob?: Blob; ext?: string; payload?: Record<string, unknown> },
  report: Report,
  label: string,
): Promise<AiResult> {
  let path: string | undefined;
  if (input.blob) {
    report(0.3, `Sending securely (${formatBytes(input.blob.size)})`);
    path = await uploadInput(input.blob, input.ext ?? "bin");
  }
  report(0.45, label);
  return runAi(tool, { ...(input.payload ?? {}), ...(path ? { path } : {}) }, (s) =>
    report(Math.min(0.92, 0.45 + s / 400), `${label} · ${formatTime(s)}`),
  );
}

/** The result files from the server, downloaded and named after the user's file. */
export async function resultFiles(res: AiResult, original: string, suffix: string, checks: string[]): Promise<Output[]> {
  const files = res.files ?? [];
  if (!files.length) throw new Error("The AI didn't return a file. Your credits were refunded if it failed.");
  return Promise.all(
    files.map(async (f) => {
      const blob = await fetchResult(f);
      const ext = f.name.split(".").pop() || "bin";
      return { blob, name: `${baseName(original)} (${suffix}).${ext}`, checks: [...checks, formatBytes(blob.size)] };
    }),
  );
}

export function creditNote(res: AiResult): string {
  return `${res.credits_used ?? 0} ${res.credits_used === 1 ? "credit" : "credits"} used${res.credits_left !== undefined ? `, ${res.credits_left.toLocaleString("en-US")} left` : ""}`;
}

// ---------------------------------------------------------------- transcripts

export interface Word {
  text: string;
  start: number;
  end: number;
  type: string;
  speaker_id?: string;
}

interface Cue {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

/** Groups words into subtitle-sized lines: up to ~42 characters or 6 seconds, split at pauses. */
export function cues(words: Word[]): Cue[] {
  const out: Cue[] = [];
  let cur: Cue | null = null;
  for (const w of words) {
    if (w.type === "spacing") {
      if (cur) cur.text += " ";
      continue;
    }
    const gap = cur ? w.start - cur.end : 0;
    const speakerChange = cur && w.speaker_id && cur.speaker && w.speaker_id !== cur.speaker;
    if (!cur || cur.text.length + w.text.length > 42 || w.end - cur.start > 6 || gap > 0.8 || speakerChange || /[.!?؟。]\s*$/.test(cur.text.trim())) {
      if (cur) out.push({ ...cur, text: cur.text.trim() });
      cur = { start: w.start, end: w.end, text: w.text, speaker: w.speaker_id };
    } else {
      cur.text += w.text;
      cur.end = w.end;
    }
  }
  if (cur) out.push({ ...cur, text: cur.text.trim() });
  return out.filter((c) => c.text);
}

const ts = (s: number, sep: string) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`;
};

export const toSrt = (c: Cue[]) => c.map((x, i) => `${i + 1}\n${ts(x.start, ",")} --> ${ts(x.end, ",")}\n${x.text}\n`).join("\n");
export const toVtt = (c: Cue[]) => `WEBVTT\n\n${c.map((x) => `${ts(x.start, ".")} --> ${ts(x.end, ".")}\n${x.text}\n`).join("\n")}`;

/** Readable transcript: paragraphs by speaker with a timestamp at each change. */
export function toTranscript(words: Word[]): string {
  const speakers = new Set(words.map((w) => w.speaker_id).filter(Boolean));
  const many = speakers.size > 1;
  const names = new Map([...speakers].map((s, i) => [s, `Speaker ${i + 1}`]));
  const out: string[] = [];
  let cur = "";
  let who: string | undefined;
  let at = 0;
  for (const w of words) {
    if (w.type !== "spacing" && w.speaker_id !== who && cur.trim()) {
      out.push(`${many ? `${names.get(who)} ` : ""}[${formatTime(at)}]\n${cur.trim()}`);
      cur = "";
    }
    if (!cur) at = w.start;
    if (w.type !== "spacing") who = w.speaker_id;
    cur += w.text;
  }
  if (cur.trim()) out.push(`${many ? `${names.get(who)} ` : ""}[${formatTime(at)}]\n${cur.trim()}`);
  return out.join("\n\n");
}
