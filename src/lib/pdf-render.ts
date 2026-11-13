// Draws PDF pages into images with pdf.js, loaded only when a tool needs it.
import type { PDFDocumentProxy } from "pdfjs-dist";

async function pdfjs() {
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
  return lib;
}

export async function openPdf(file: File): Promise<PDFDocumentProxy> {
  const lib = await pdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  try {
    return await lib.getDocument({ data }).promise;
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === "PasswordException") {
      throw new Error(`${file.name} is password-protected. Remove the password with Unlock PDF (you'll need the password), then try again.`);
    }
    throw new Error(`${file.name} couldn't be read as a PDF. It may be damaged.`);
  }
}

/** Renders one page (1-based) at the given scale, on a white background. */
export async function renderPage(doc: PDFDocumentProxy, pageNumber: number, scale: number): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser blocked drawing the page. Try another browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  page.cleanup();
  return canvas;
}

/** Small preview images for every page, sized to fit a width in CSS pixels. */
export async function thumbnails(file: File, width: number, onEach?: (i: number, url: string) => void): Promise<string[]> {
  const doc = await openPdf(file);
  const urls: string[] = [];
  const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const canvas = await renderPage(doc, i, (width * dpr) / base.width);
    const url = canvas.toDataURL("image/jpeg", 0.8);
    urls.push(url);
    onEach?.(i - 1, url);
  }
  await doc.loadingTask.destroy();
  return urls;
}
