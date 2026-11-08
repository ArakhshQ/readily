// Small helpers shared by every tool: sizes, names, downloads, image loading.

export interface Output {
  blob: Blob;
  name: string;
  /** Plain-language facts about the result, shown as a readiness check. */
  checks: string[];
  /** Optional note when something didn't go exactly as asked. */
  note?: string;
}

export const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 MB per file, a safety limit for phones

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB`;
}

export function baseName(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

export function withExt(name: string, ext: string): string {
  return `${baseName(name)}.${ext}`;
}

export function extFor(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/zip") return "zip";
  return "bin";
}

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function isImage(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function zipOutputs(outputs: Output[], zipName: string): Promise<Output> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const used = new Set<string>();
  for (const o of outputs) {
    let name = o.name;
    let n = 2;
    while (used.has(name)) name = `${baseName(o.name)} (${n++}).${o.name.split(".").pop()}`;
    used.add(name);
    zip.file(name, o.blob);
  }
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/zip" });
  return { blob, name: zipName, checks: [`${outputs.length} files`, formatBytes(blob.size)] };
}

/** Loads an image through an <img> element so the browser applies EXIF rotation. */
export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const name = file instanceof File ? file.name : "This image";
      const heic = /\.(heic|heif)$/i.test(name) || /heic|heif/i.test(file.type);
      reject(
        new Error(
          heic
            ? `${name} is an iPhone HEIC photo, which this browser can't open. Open Readily in Safari, or share the photo as JPG first.`
            : `${name} couldn't be opened as an image. It may be damaged or in a format this browser doesn't support.`,
        ),
      );
    };
    img.src = url;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Your browser couldn't save this image. Try a smaller image or another format."))),
      type,
      quality,
    );
  });
}

/** Safari and some older browsers can't encode WebP and silently return PNG. */
let webpSupport: boolean | null = null;
export async function canEncodeWebp(): Promise<boolean> {
  if (webpSupport !== null) return webpSupport;
  const c = document.createElement("canvas");
  c.width = c.height = 2;
  try {
    const b = await canvasToBlob(c, "image/webp", 0.8);
    webpSupport = b.type === "image/webp";
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

/** Reads the EXIF orientation of a JPEG (1 = upright). Returns 1 when absent. */
export async function jpegOrientation(file: Blob): Promise<number> {
  const buf = await file.slice(0, 128 * 1024).arrayBuffer();
  const v = new DataView(buf);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return 1;
  let off = 2;
  while (off + 4 <= v.byteLength) {
    const marker = v.getUint16(off);
    const len = v.getUint16(off + 2);
    if (marker === 0xffe1 && off + 10 <= v.byteLength && v.getUint32(off + 4) === 0x45786966) {
      const tiff = off + 10;
      if (tiff + 8 > v.byteLength) return 1;
      const little = v.getUint16(tiff) === 0x4949;
      const ifd = tiff + v.getUint32(tiff + 4, little);
      if (ifd + 2 > v.byteLength) return 1;
      const count = v.getUint16(ifd, little);
      for (let i = 0; i < count; i++) {
        const entry = ifd + 2 + i * 12;
        if (entry + 12 > v.byteLength) return 1;
        if (v.getUint16(entry, little) === 0x0112) return v.getUint16(entry + 8, little);
      }
      return 1;
    }
    if ((marker & 0xff00) !== 0xff00) return 1;
    off += 2 + len;
  }
  return 1;
}
