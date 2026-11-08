// Text recognition with tesseract.js, served from Readily itself (public/vendor).
import type { Worker } from "tesseract.js";
import { isPdf, formatBytes, type Output, baseName } from "./files";

let progressCb: ((p: number) => void) | null = null;
let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const T = await import("tesseract.js");
      return T.createWorker("eng", 1, {
        workerPath: "/vendor/tesseract/worker.min.js",
        corePath: "/vendor/tesseract/core",
        langPath: "/vendor/tesseract/lang",
        gzip: true,
        workerBlobURL: false,
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") progressCb?.(m.progress);
        },
      });
    })().catch((e) => {
      workerPromise = null;
      throw e;
    });
  }
  return workerPromise;
}

async function read(worker: Worker, source: HTMLCanvasElement | Blob): Promise<string> {
  const { data } = await worker.recognize(source);
  return data.text.replace(/\n{3,}/g, "\n\n").trim();
}

/** Recognizes text in images and PDFs. One combined text result. */
export async function imagesToText(files: File[], onProgress: (p: number, label: string) => void): Promise<Output> {
  onProgress(0, "Loading the reading engine");
  const worker = await getWorker();
  const parts: string[] = [];
  const total = files.length;
  for (let f = 0; f < total; f++) {
    const file = files[f];
    if (isPdf(file)) {
      const { openPdf, renderPage } = await import("./pdf-render");
      const doc = await openPdf(file);
      for (let p = 1; p <= doc.numPages; p++) {
        progressCb = (x) => onProgress((f + (p - 1 + x) / doc.numPages) / total, `Reading ${file.name}, page ${p} of ${doc.numPages}`);
        const canvas = await renderPage(doc, p, 2);
        const text = await read(worker, canvas);
        parts.push(`${total > 1 || doc.numPages > 1 ? `--- ${file.name}, page ${p} ---\n` : ""}${text}`);
        canvas.width = canvas.height = 0;
      }
      await doc.loadingTask.destroy();
    } else {
      progressCb = (x) => onProgress((f + x) / total, `Reading ${file.name}`);
      const text = await read(worker, file);
      parts.push(`${total > 1 ? `--- ${file.name} ---\n` : ""}${text}`);
    }
  }
  progressCb = null;
  const text = parts.join("\n\n").trim();
  const words = text ? text.split(/\s+/).length : 0;
  const blob = new Blob([text], { type: "text/plain" });
  return {
    blob,
    name: `${files.length === 1 ? baseName(files[0].name) : "readily-text"}.txt`,
    checks: [words ? `${words} words found` : "No text found", formatBytes(blob.size)],
    note: words ? undefined : "No readable text was found. Try a sharper, well-lit photo taken straight on, or crop to the text area.",
    preview: text,
  };
}
