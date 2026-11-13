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
      throw new Error(`${file.name} is password-protected. Remove the password with Unlock PDF (you'll need the password), then try again.`);
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

// ---------------------------------------------------------------- shared placement

type PdfPage = import("pdf-lib").PDFPage;

const normRot = (a: number) => (((Math.round(a / 90) * 90) % 360) + 360) % 360;

/** Size of a page as it looks when opened (rotation applied), in points. */
function visualSize(page: PdfPage) {
  const { width, height } = page.getCropBox();
  return normRot(page.getRotation().angle) % 180 ? { w: height, h: width } : { w: width, h: height };
}

/**
 * Converts a point measured on the page as it looks when opened (origin bottom-left)
 * into the page's own coordinates, plus the rotation that makes drawings appear upright.
 */
function place(page: PdfPage, vx: number, vy: number) {
  const rot = normRot(page.getRotation().angle);
  const { x: bx, y: by, width: w, height: h } = page.getCropBox();
  let x = vx;
  let y = vy;
  if (rot === 90) {
    x = w - vy;
    y = vx;
  } else if (rot === 180) {
    x = w - vx;
    y = h - vy;
  } else if (rot === 270) {
    x = vy;
    y = h - vx;
  }
  return { x: bx + x, y: by + y, rot };
}

function unsupportedText(): Error {
  return new Error("That text has letters the built-in PDF font can't draw yet. Use English letters, numbers and common punctuation.");
}

// ---------------------------------------------------------------- compress

export type CompressLevel = "lossless" | "balanced" | "strong";

export async function compressPdf(file: File, level: CompressLevel, onProgress?: (p: number) => void): Promise<Output> {
  const { PDFDocument } = await pdfLib();
  const original = file.size;
  let best: { blob: Blob; how: string } | null = null;

  // Step 1: tidy the file's structure (keeps text selectable).
  try {
    const doc = await loadPdf(file);
    const bytes = await doc.save({ useObjectStreams: true });
    best = { blob: pdfBlob(bytes), how: "structure" };
  } catch (e) {
    if (e instanceof Error && /password/i.test(e.message)) throw e;
  }
  onProgress?.(0.1);

  // Step 2: for stronger levels, redraw every page as a compressed image.
  if (level !== "lossless") {
    const { openPdf, renderPage } = await import("./pdf-render");
    const src = await openPdf(file);
    const dpi = level === "balanced" ? 144 : 96;
    const quality = level === "balanced" ? 0.72 : 0.55;
    const out = await PDFDocument.create();
    out.setProducer("Readily");
    for (let i = 1; i <= src.numPages; i++) {
      const page = await src.getPage(i);
      const vp = page.getViewport({ scale: 1 });
      const canvas = await renderPage(src, i, dpi / 72);
      const jpg = await canvasToBlob(canvas, "image/jpeg", quality);
      const img = await out.embedJpg(await jpg.arrayBuffer());
      const p = out.addPage([vp.width, vp.height]);
      p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
      canvas.width = canvas.height = 0;
      onProgress?.(0.1 + (0.85 * i) / src.numPages);
    }
    await src.loadingTask.destroy();
    const blob = pdfBlob(await out.save({ useObjectStreams: true }));
    if (!best || blob.size < best.blob.size) best = { blob, how: "pages" };
  }

  const name = file.name.replace(/\.pdf$/i, "") + " (compressed).pdf";
  if (!best || best.blob.size >= original * 0.98) {
    return {
      blob: file,
      name: file.name,
      checks: [formatBytes(original), "Original kept"],
      note:
        level === "lossless"
          ? "This PDF is already compact. Try \"Balanced\" or \"Smallest\" for more savings, which turns pages into images."
          : "Readily couldn't make this PDF meaningfully smaller, so your original was kept unchanged.",
    };
  }
  const saved = Math.round((1 - best.blob.size / original) * 100);
  return {
    blob: best.blob,
    name,
    checks: [`${saved}% smaller`, `${formatBytes(best.blob.size)} (was ${formatBytes(original)})`],
    note: best.how === "pages" ? "Pages were saved as images, so text in this copy can't be selected or searched. Keep your original for that." : undefined,
  };
}

// ---------------------------------------------------------------- PDF to images

export async function pdfToImages(
  file: File,
  opts: { dpi: number; format: "image/jpeg" | "image/png"; ranges: string | null },
  onProgress?: (p: number) => void,
): Promise<Output[]> {
  const { openPdf, renderPage } = await import("./pdf-render");
  const doc = await openPdf(file);
  const total = doc.numPages;
  const pages = opts.ranges ? parseRanges(opts.ranges, total).map((i) => i + 1) : Array.from({ length: total }, (_, i) => i + 1);
  const stem = baseName(file.name);
  const pad = String(total).length;
  const ext = opts.format === "image/png" ? "png" : "jpg";
  const outputs: Output[] = [];
  for (let k = 0; k < pages.length; k++) {
    const n = pages[k];
    const canvas = await renderPage(doc, n, opts.dpi / 72);
    const blob = await canvasToBlob(canvas, opts.format, opts.format === "image/jpeg" ? 0.9 : undefined);
    outputs.push({
      blob,
      name: `${stem} - page ${String(n).padStart(pad, "0")}.${ext}`,
      checks: [`Page ${n}`, `${canvas.width} × ${canvas.height} px`, formatBytes(blob.size)],
    });
    canvas.width = canvas.height = 0;
    onProgress?.((k + 1) / pages.length);
  }
  await doc.loadingTask.destroy();
  return outputs;
}

// ---------------------------------------------------------------- organize

export interface PagePlan {
  /** Zero-based index of the page in the original file. */
  index: number;
  /** Extra clockwise rotation in degrees (0, 90, 180, 270). */
  rotate: number;
}

export async function organizePdf(file: File, plan: PagePlan[]): Promise<Output> {
  if (!plan.length) throw new Error("Keep at least one page.");
  const { PDFDocument, degrees } = await pdfLib();
  const src = await loadPdf(file);
  const out = await PDFDocument.create();
  out.setProducer("Readily");
  const copied = await out.copyPages(
    src,
    plan.map((p) => p.index),
  );
  copied.forEach((page, k) => {
    const extra = plan[k].rotate;
    if (extra) page.setRotation(degrees(normRot(page.getRotation().angle + extra)));
    out.addPage(page);
  });
  const blob = pdfBlob(await out.save());
  const removed = src.getPageCount() - plan.length;
  const turned = plan.filter((p) => p.rotate).length;
  const checks = [pageWord(plan.length)];
  if (removed) checks.push(`${removed} removed`);
  if (turned) checks.push(`${turned} rotated`);
  checks.push(formatBytes(blob.size));
  return { blob, name: `${baseName(file.name)} (organized).pdf`, checks };
}

// ---------------------------------------------------------------- page numbers

export type NumberPosition = "bl" | "bc" | "br" | "tl" | "tc" | "tr";
export type NumberFormat = "n" | "page-n" | "page-n-of" | "n-of";

export async function addPageNumbers(
  file: File,
  opts: { position: NumberPosition; format: NumberFormat; start: number; size: number; skipFirst: boolean },
): Promise<Output> {
  const { StandardFonts, rgb, degrees } = await pdfLib();
  const doc = await loadPdf(file);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const counted = pages.length - (opts.skipFirst ? 1 : 0);
  pages.forEach((page, i) => {
    if (opts.skipFirst && i === 0) return;
    const n = opts.start + i - (opts.skipFirst ? 1 : 0);
    const last = opts.start + counted - 1;
    const text =
      opts.format === "n" ? `${n}` : opts.format === "page-n" ? `Page ${n}` : opts.format === "page-n-of" ? `Page ${n} of ${last}` : `${n} / ${last}`;
    const { w, h } = visualSize(page);
    const tw = font.widthOfTextAtSize(text, opts.size);
    const margin = Math.max(18, Math.min(w, h) * 0.04);
    const col = opts.position[1];
    const vx = col === "l" ? margin : col === "c" ? (w - tw) / 2 : w - margin - tw;
    const vy = opts.position[0] === "b" ? margin : h - margin - opts.size * 0.75;
    const at = place(page, vx, vy);
    page.drawText(text, { x: at.x, y: at.y, size: opts.size, font, color: rgb(0.13, 0.15, 0.22), rotate: degrees(at.rot) });
  });
  const blob = pdfBlob(await doc.save());
  return {
    blob,
    name: `${baseName(file.name)} (numbered).pdf`,
    checks: [`${counted} pages numbered`, `Starts at ${opts.start}`, formatBytes(blob.size)],
  };
}

// ---------------------------------------------------------------- watermark

export async function watermarkPdf(
  file: File,
  opts: { text: string; size: number; opacity: number; color: [number, number, number]; diagonal: boolean; tile: boolean },
): Promise<Output> {
  const { StandardFonts, rgb, degrees } = await pdfLib();
  const text = opts.text.trim();
  if (!text) throw new Error("Type the watermark text first.");
  const doc = await loadPdf(file);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  let tw: number;
  try {
    tw = font.widthOfTextAtSize(text, opts.size);
  } catch {
    throw unsupportedText();
  }
  const cap = font.heightAtSize(opts.size, { descender: false });
  const a = opts.diagonal ? Math.PI / 4 : 0;
  const color = rgb(...opts.color);

  for (const page of doc.getPages()) {
    const { w, h } = visualSize(page);
    const centers: [number, number][] = [];
    if (opts.tile) {
      const stepX = tw * Math.cos(a) + opts.size * 3;
      const stepY = opts.size * 5 + tw * Math.sin(a) * 0.6;
      for (let cy = stepY / 2; cy < h + stepY; cy += stepY) {
        const shift = Math.round(cy / stepY) % 2 ? stepX / 2 : 0;
        for (let cx = -stepX / 2 + shift; cx < w + stepX; cx += stepX) centers.push([cx, cy]);
      }
    } else {
      centers.push([w / 2, h / 2]);
    }
    for (const [cx, cy] of centers) {
      // Start point so the text's middle sits on the center, after rotating by a.
      const vx = cx - (tw / 2) * Math.cos(a) + (cap / 2) * Math.sin(a);
      const vy = cy - (tw / 2) * Math.sin(a) - (cap / 2) * Math.cos(a);
      const at = place(page, vx, vy);
      page.drawText(text, {
        x: at.x,
        y: at.y,
        size: opts.size,
        font,
        color,
        opacity: opts.opacity,
        rotate: degrees(at.rot + (a * 180) / Math.PI),
      });
    }
  }
  const blob = pdfBlob(await doc.save());
  return {
    blob,
    name: `${baseName(file.name)} (watermarked).pdf`,
    checks: [`“${text}” on ${pageWord(doc.getPageCount())}`, formatBytes(blob.size)],
  };
}

// ---------------------------------------------------------------- sign

/**
 * Places a PNG signature on one page. x, y and width are fractions of the page
 * as it looks when opened: x/y are the signature's top-left corner.
 */
export async function signPdf(
  file: File,
  signature: { png: Blob; width: number; height: number },
  spot: { page: number; x: number; y: number; w: number },
): Promise<Output> {
  const { degrees } = await pdfLib();
  const doc = await loadPdf(file);
  const page = doc.getPage(spot.page);
  const img = await doc.embedPng(await signature.png.arrayBuffer());
  const { w, h } = visualSize(page);
  const sw = spot.w * w;
  const sh = (sw * signature.height) / signature.width;
  const vx = spot.x * w;
  const vy = (1 - spot.y) * h - sh;
  const at = place(page, vx, vy);
  page.drawImage(img, { x: at.x, y: at.y, width: sw, height: sh, rotate: degrees(at.rot) });
  const blob = pdfBlob(await doc.save());
  return {
    blob,
    name: `${baseName(file.name)} (signed).pdf`,
    checks: [`Signed on page ${spot.page + 1}`, pageWord(doc.getPageCount()), formatBytes(blob.size)],
  };
}
