// PDF work with pdf-lib, loaded only when a PDF tool runs.
import { baseName, canvasToBlob, formatBytes, jpegOrientation, loadImage, type Output } from "./files";
import { render } from "./image-ops";

export type PageSize = "fit" | "a4" | "letter";
export type Margin = "none" | "small" | "normal";

const SIZES: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};
const MARGINS: Record<Margin, number> = { none: 0, small: 18, normal: 36 };

async function pdfLib() {
  return import("pdf-lib");
}

function pageWord(n: number) {
  return `${n} ${n === 1 ? "page" : "pages"}`;
}

async function loadPdf(file: File) {
  const { PDFDocument } = await pdfLib();
  const bytes = await file.arrayBuffer();
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/encrypt/i.test(msg)) {
      throw new Error(`${file.name} is password-protected. Remove the password in your PDF reader, then try again.`);
    }
    throw new Error(`${file.name} couldn't be read as a PDF. It may be damaged.`);
  }
}

function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

// ---------------------------------------------------------------- images → PDF

export interface ImagesToPdfOptions {
  pageSize: PageSize;
  margin: Margin;
  name: string;
}

export async function imagesToPdf(files: File[], opts: ImagesToPdfOptions, onProgress?: (done: number) => void): Promise<Output> {
  const { PDFDocument } = await pdfLib();
  const doc = await PDFDocument.create();
  doc.setProducer("Readily");
  doc.setCreator("Readily");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const img = await loadImage(file);
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Embed JPG and PNG as-is when that's safe, so quality and size don't change.
    // Rotated phone photos and other formats are redrawn so they come out upright.
    let embedded;
    const isJpeg = file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name);
    const isPng = file.type === "image/png" || /\.png$/i.test(file.name);
    if (isJpeg && (await jpegOrientation(file)) === 1) {
      embedded = await doc.embedJpg(await file.arrayBuffer());
    } else if (isPng) {
      embedded = await doc.embedPng(await file.arrayBuffer());
    } else {
      const canvas = render(img, iw, ih, "stretch", "#ffffff");
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
      embedded = await doc.embedJpg(await blob.arrayBuffer());
    }

    const m = MARGINS[opts.margin];
    let pw: number;
    let ph: number;
    if (opts.pageSize === "fit") {
      // 96 px per inch screen pixels become 72 pt per inch PDF points.
      pw = iw * 0.75 + m * 2;
      ph = ih * 0.75 + m * 2;
    } else {
      const [sw, sh] = SIZES[opts.pageSize];
      const landscape = iw > ih;
      pw = landscape ? sh : sw;
      ph = landscape ? sw : sh;
    }
    const page = doc.addPage([pw, ph]);
    const scale = Math.min((pw - m * 2) / iw, (ph - m * 2) / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    page.drawImage(embedded, { x: (pw - dw) / 2, y: (ph - dh) / 2, width: dw, height: dh });
    onProgress?.(i + 1);
  }

  const blob = pdfBlob(await doc.save());
  const sizeLabel = opts.pageSize === "fit" ? "Pages sized to images" : opts.pageSize === "a4" ? "A4 pages" : "Letter pages";
  return { blob, name: `${opts.name || "images"}.pdf`, checks: [pageWord(files.length), sizeLabel, formatBytes(blob.size)] };
}

// ---------------------------------------------------------------- merge

export async function mergePdfs(files: File[], name: string, onProgress?: (done: number) => void): Promise<Output> {
  const { PDFDocument } = await pdfLib();
  const out = await PDFDocument.create();
  out.setProducer("Readily");
  let pages = 0;
  for (let i = 0; i < files.length; i++) {
    const src = await loadPdf(files[i]);
    const copied = await out.copyPages(src, src.getPageIndices());
    copied.forEach((p) => out.addPage(p));
    pages += copied.length;
    onProgress?.(i + 1);
  }
  const blob = pdfBlob(await out.save());
  return {
    blob,
    name: `${name || "merged"}.pdf`,
    checks: [`${files.length} files combined`, pageWord(pages), formatBytes(blob.size)],
  };
}

export async function pageCount(file: File): Promise<number> {
  const doc = await loadPdf(file);
  return doc.getPageCount();
}

// ---------------------------------------------------------------- split

/** Parses "1-3, 5, 8-" into zero-based page indexes. Throws a readable error. */
export function parseRanges(input: string, total: number): number[] {
  const text = input.replace(/\s+/g, "");
  if (!text) throw new Error("Type the pages you want, for example 1-3, 5.");
  const pages: number[] = [];
  for (const part of text.split(",")) {
    if (!part) continue;
    const m = part.match(/^(\d+)?(-)?(\d+)?$/);
    if (!m || (!m[1] && !m[3])) throw new Error(`"${part}" isn't a page or range. Use numbers like 2 or 4-7.`);
    const start = m[1] ? parseInt(m[1], 10) : 1;
    const end = m[2] ? (m[3] ? parseInt(m[3], 10) : total) : start;
    if (start < 1 || end < 1) throw new Error("Page numbers start at 1.");
    if (start > total || end > total) throw new Error(`This PDF has ${pageWord(total)}, so "${part}" is out of range.`);
    if (end < start) throw new Error(`"${part}" goes backwards. Write it as ${end}-${start}.`);
    for (let p = start; p <= end; p++) pages.push(p - 1);
  }
  if (!pages.length) throw new Error("Type the pages you want, for example 1-3, 5.");
  return pages;
}

async function extract(srcFile: File, indexes: number[]): Promise<Blob> {
  const { PDFDocument } = await pdfLib();
  const src = await loadPdf(srcFile);
  const out = await PDFDocument.create();
  out.setProducer("Readily");
  const copied = await out.copyPages(src, indexes);
  copied.forEach((p) => out.addPage(p));
  return pdfBlob(await out.save());
}

function rangeLabel(indexes: number[]): string {
  const first = indexes[0] + 1;
  const last = indexes[indexes.length - 1] + 1;
  return first === last ? `${first}` : `${first}-${last}`;
}

export type SplitMode = "extract" | "every-page" | "every-n";

export async function splitPdf(
  file: File,
  mode: SplitMode,
  opts: { ranges: string; n: number },
  onProgress?: (done: number, total: number) => void,
): Promise<Output[]> {
  const total = await pageCount(file);
  const stem = baseName(file.name);

  if (mode === "extract") {
    const idx = parseRanges(opts.ranges, total);
    const blob = await extract(file, idx);
    return [{ blob, name: `${stem} (pages ${opts.ranges.replace(/\s+/g, "")}).pdf`, checks: [pageWord(idx.length), `from ${pageWord(total)}`, formatBytes(blob.size)] }];
  }

  const size = mode === "every-page" ? 1 : Math.max(1, Math.floor(opts.n));
  if (size >= total) throw new Error(`This PDF has ${pageWord(total)}, so there's nothing to split. Pick a smaller number.`);
  const groups: number[][] = [];
  for (let s = 0; s < total; s += size) groups.push(Array.from({ length: Math.min(size, total - s) }, (_, k) => s + k));

  const pad = String(total).length;
  const outputs: Output[] = [];
  for (let g = 0; g < groups.length; g++) {
    const blob = await extract(file, groups[g]);
    const label = groups[g].length === 1 ? `page ${String(groups[g][0] + 1).padStart(pad, "0")}` : `pages ${rangeLabel(groups[g])}`;
    outputs.push({ blob, name: `${stem} - ${label}.pdf`, checks: [pageWord(groups[g].length), formatBytes(blob.size)] });
    onProgress?.(g + 1, groups.length);
  }
  return outputs;
}
