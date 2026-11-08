// Image processing on a <canvas>: compress to a target size, resize, convert.
import { canEncodeWebp, canvasToBlob, formatBytes, loadImage, withExt, extFor, type Output } from "./files";

export type OutFormat = "image/jpeg" | "image/png" | "image/webp";
export type FitMode = "crop" | "fit" | "stretch";

export const FORMAT_LABEL: Record<OutFormat, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser blocked image processing. Try another browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

/**
 * Draws the image onto a new canvas of the given size.
 * crop: fill the box and trim the overflow; fit: whole image inside with padding; stretch: ignore shape.
 */
export function render(
  img: HTMLImageElement,
  w: number,
  h: number,
  mode: FitMode = "stretch",
  background: string | null = null,
): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(w, h);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (mode === "stretch") {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } else {
    const scale = mode === "crop" ? Math.max(canvas.width / iw, canvas.height / ih) : Math.min(canvas.width / iw, canvas.height / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
  }
  return canvas;
}

/** When a format can't be encoded by this browser (WebP in Safari), fall back to JPG. */
async function usableFormat(format: OutFormat): Promise<{ format: OutFormat; note?: string }> {
  if (format === "image/webp" && !(await canEncodeWebp())) {
    return { format: "image/jpeg", note: "This browser can't save WebP, so the image was saved as JPG instead." };
  }
  return { format };
}

const needsWhite = (f: OutFormat) => f === "image/jpeg";

// ---------------------------------------------------------------- compress

export interface CompressOptions {
  /** Target size in bytes, or null to use a fixed quality. */
  targetBytes: number | null;
  /** 0..1, used when targetBytes is null. */
  quality: number;
  /** "auto" keeps JPG/WebP and turns PNG and others into JPG. */
  format: OutFormat | "auto";
  /** How the user wrote the target, e.g. "200 KB", for the readiness check. */
  targetLabel?: string;
}

export async function compressImage(file: File, opts: CompressOptions): Promise<Output> {
  const img = await loadImage(file);
  let wanted: OutFormat;
  if (opts.format !== "auto") wanted = opts.format;
  else wanted = file.type === "image/webp" ? "image/webp" : "image/jpeg";
  const { format, note: fmtNote } = await usableFormat(wanted);
  const notes: string[] = fmtNote ? [fmtNote] : [];

  let w = img.naturalWidth;
  let h = img.naturalHeight;
  const bg = needsWhite(format) ? "#ffffff" : null;
  const sameType = file.type === format;

  // Already small enough and in the right format: hand back the original untouched.
  if (opts.targetBytes !== null && sameType && file.size <= opts.targetBytes) {
    return {
      blob: file,
      name: file.name,
      checks: [`Under ${opts.targetLabel ?? formatBytes(opts.targetBytes)}`, formatBytes(file.size), `${w} × ${h} px`, FORMAT_LABEL[format]],
      note: "This image was already under your target, so it was kept exactly as it was.",
    };
  }

  // Fixed quality: one pass. If that doesn't help, keep the original.
  if (opts.targetBytes === null) {
    const blob = await canvasToBlob(render(img, w, h, "stretch", bg), format, opts.quality);
    if (sameType && blob.size >= file.size) {
      return {
        blob: file,
        name: file.name,
        checks: [formatBytes(file.size), `${w} × ${h} px`, FORMAT_LABEL[format]],
        note: "This image is already well compressed, so the original was kept. Try a lower quality or a target size.",
      };
    }
    return finish(file, blob, format, w, h, notes, null, "");
  }

  const label = opts.targetLabel ?? formatBytes(opts.targetBytes);
  const target = opts.targetBytes;
  let best: Blob | null = null;
  let bestDims = { w, h };

  // Up to 8 rounds: binary-search quality at the current size; if even the lowest
  // acceptable quality is too big, shrink the dimensions and try again.
  for (let round = 0; round < 8 && !best; round++) {
    const canvas = render(img, w, h, "stretch", bg);
    let lo = 0.3;
    let hi = 0.95;
    let fit: Blob | null = null;

    const top = await canvasToBlob(canvas, format, hi);
    if (top.size <= target) {
      fit = top;
    } else {
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2;
        const b = await canvasToBlob(canvas, format, mid);
        if (b.size <= target) {
          fit = b;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      if (!fit) {
        const floor = await canvasToBlob(canvas, format, lo);
        if (floor.size <= target) fit = floor;
        else {
          // Shrink by the square root of the size ratio, with a little headroom.
          const ratio = Math.sqrt(target / floor.size) * 0.92;
          const scale = Math.min(0.9, Math.max(0.2, ratio));
          w = Math.max(16, Math.round(w * scale));
          h = Math.max(16, Math.round(h * scale));
          continue;
        }
      }
    }
    best = fit;
    bestDims = { w, h };
  }

  if (!best) {
    const blob = await canvasToBlob(render(img, w, h, "stretch", bg), format, 0.3);
    notes.push(`Couldn't get under ${label} without making the image unusable. This is the smallest reasonable version.`);
    return finish(file, blob, format, w, h, notes, target, label);
  }
  if (bestDims.w !== img.naturalWidth) {
    notes.push(`Dimensions were reduced from ${img.naturalWidth} × ${img.naturalHeight} to reach the size.`);
  }
  return finish(file, best, format, bestDims.w, bestDims.h, notes, target, label);
}

function finish(file: File, blob: Blob, format: OutFormat, w: number, h: number, notes: string[], target: number | null, label: string): Output {
  const checks = [
    target !== null && blob.size <= target ? `Under ${label}` : formatBytes(blob.size),
    `${w} × ${h} px`,
    FORMAT_LABEL[format],
  ];
  if (target !== null && blob.size <= target) checks.splice(1, 0, `${formatBytes(blob.size)} (was ${formatBytes(file.size)})`);
  else checks.push(`was ${formatBytes(file.size)}`);
  return {
    blob,
    name: withExt(file.name, extFor(format)),
    checks,
    note: notes.length ? notes.join(" ") : undefined,
  };
}

// ---------------------------------------------------------------- resize

export interface ResizeOptions {
  width: number;
  height: number;
  mode: FitMode;
  format: OutFormat | "same";
}

export function sameFormat(file: File): OutFormat {
  if (file.type === "image/png" || file.type === "image/gif" || file.type === "image/bmp") return "image/png";
  if (file.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

export async function resizeImage(file: File, opts: ResizeOptions): Promise<Output> {
  const img = await loadImage(file);
  const { format, note } = await usableFormat(opts.format === "same" ? sameFormat(file) : opts.format);
  const bg = needsWhite(format) || opts.mode === "fit" ? "#ffffff" : null;
  const canvas = render(img, opts.width, opts.height, opts.mode, bg);
  const blob = await canvasToBlob(canvas, format, format === "image/png" ? undefined : 0.92);
  return {
    blob,
    name: `${withExt(file.name, extFor(format)).replace(/(\.[a-z]+)$/, `-${canvas.width}x${canvas.height}$1`)}`,
    checks: [`${canvas.width} × ${canvas.height} px`, `was ${img.naturalWidth} × ${img.naturalHeight}`, FORMAT_LABEL[format], formatBytes(blob.size)],
    note,
  };
}

export async function imageSize(file: File): Promise<{ w: number; h: number }> {
  const img = await loadImage(file);
  return { w: img.naturalWidth, h: img.naturalHeight };
}

// ---------------------------------------------------------------- convert

export async function convertImage(file: File, target: OutFormat, quality = 0.92): Promise<Output> {
  const img = await loadImage(file);
  const { format, note } = await usableFormat(target);
  const canvas = render(img, img.naturalWidth, img.naturalHeight, "stretch", needsWhite(format) ? "#ffffff" : null);
  const blob = await canvasToBlob(canvas, format, format === "image/png" ? undefined : quality);
  return {
    blob,
    name: withExt(file.name, extFor(format)),
    checks: [FORMAT_LABEL[format], `${canvas.width} × ${canvas.height} px`, formatBytes(blob.size)],
    note,
  };
}

// ---------------------------------------------------------------- HEIC

export async function heicToImage(file: File, target: "image/jpeg" | "image/png", quality = 0.92): Promise<Output[]> {
  const { default: heic2any } = await import("heic2any");
  let result: Blob | Blob[];
  try {
    result = await heic2any({ blob: file, toType: target, quality });
  } catch (e) {
    // Some "HEIC" files are really JPGs with the wrong name; the browser can open those directly.
    const msg = (e as { message?: string })?.message || "";
    if (/already browser readable/i.test(msg)) return [await convertImage(file, target, quality)];
    throw new Error(`${file.name} couldn't be converted. It may be damaged or not a real HEIC photo.`);
  }
  const blobs = Array.isArray(result) ? result : [result];
  const ext = target === "image/png" ? "png" : "jpg";
  const outs: Output[] = [];
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    const img = await loadImage(b);
    outs.push({
      blob: b,
      name: blobs.length > 1 ? `${withExt(file.name, ext).replace(`.${ext}`, ` (${i + 1}).${ext}`)}` : withExt(file.name, ext),
      checks: [FORMAT_LABEL[target], `${img.naturalWidth} × ${img.naturalHeight} px`, formatBytes(b.size), `was ${formatBytes(file.size)} HEIC`],
    });
  }
  return outs;
}

// ---------------------------------------------------------------- crop

export async function cropImage(file: File, rect: { x: number; y: number; w: number; h: number }, format: OutFormat | "same"): Promise<Output> {
  const img = await loadImage(file);
  const { format: fmt, note } = await usableFormat(format === "same" ? sameFormat(file) : format);
  const x = Math.max(0, Math.round(rect.x));
  const y = Math.max(0, Math.round(rect.y));
  const w = Math.max(1, Math.min(img.naturalWidth - x, Math.round(rect.w)));
  const h = Math.max(1, Math.min(img.naturalHeight - y, Math.round(rect.h)));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser blocked image processing. Try another browser.");
  if (fmt === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
  const blob = await canvasToBlob(canvas, fmt, fmt === "image/png" ? undefined : 0.92);
  return {
    blob,
    name: withExt(file.name, extFor(fmt)).replace(/(\.[a-z]+)$/, `-cropped$1`),
    checks: [`${w} × ${h} px`, `was ${img.naturalWidth} × ${img.naturalHeight}`, FORMAT_LABEL[fmt], formatBytes(blob.size)],
    note,
  };
}
