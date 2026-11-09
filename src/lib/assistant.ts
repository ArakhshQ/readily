// Runs the steps the assistant planned, using Readily's own tools on the device.
import { baseName, isHeic, isImage, isPdf, type Output } from "./files";
import { blobToFile } from "./handoff";

export type Step =
  | { op: "images_to_pdf"; page?: "a4" | "letter" | "fit" }
  | { op: "merge_pdfs" }
  | { op: "compress_pdf"; level?: "balanced" | "strong" }
  | { op: "pdf_under_size"; target_kb: number }
  | { op: "compress_image"; target_kb: number }
  | { op: "resize_image"; width?: number | null; height?: number | null }
  | { op: "convert_image"; format: "jpg" | "png" | "webp" }
  | { op: "heic_to_jpg" }
  | { op: "split_pdf"; ranges: string }
  | { op: "pdf_to_images"; format?: "jpg" | "png" }
  | { op: "rotate_pdf"; degrees: 90 | 180 | 270 }
  | { op: "add_page_numbers" }
  | { op: "rename"; name: string };

export const STEP_LABEL: Record<Step["op"], string> = {
  images_to_pdf: "Put the images into one PDF",
  merge_pdfs: "Join the PDFs",
  compress_pdf: "Compress the PDF",
  pdf_under_size: "Shrink the PDF under the size",
  compress_image: "Shrink each image under the size",
  resize_image: "Resize the images",
  convert_image: "Convert the images",
  heic_to_jpg: "Turn iPhone photos into JPG",
  split_pdf: "Take out the pages",
  pdf_to_images: "Turn the pages into images",
  rotate_pdf: "Rotate the pages",
  add_page_numbers: "Number the pages",
  rename: "Name the result",
};

export function describeStep(s: Step): string {
  const base = STEP_LABEL[s.op] ?? s.op;
  if ((s.op === "pdf_under_size" || s.op === "compress_image") && s.target_kb) return `${base} (${s.target_kb >= 1000 ? `${s.target_kb / 1000} MB` : `${s.target_kb} KB`})`;
  if (s.op === "resize_image") return `${base} (${s.width ?? "auto"} × ${s.height ?? "auto"})`;
  if (s.op === "convert_image") return `${base} to ${s.format.toUpperCase()}`;
  if (s.op === "split_pdf") return `${base} ${s.ranges}`;
  if (s.op === "rotate_pdf") return `${base} ${s.degrees}°`;
  if (s.op === "rename") return `${base} “${s.name}”`;
  return base;
}

const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

export async function runSteps(input: File[], steps: Step[], report: (p: number, label?: string) => void): Promise<Output[]> {
  const pdf = await import("./pdf-ops");
  const img = await import("./image-ops");
  let files = input;
  let outs: Output[] = [];
  const toFiles = (o: Output[]) => o.map((x) => blobToFile(x.blob, x.name));
  const stem = files.length === 1 ? baseName(files[0].name) : "readily";

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    report(i / steps.length, describeStep(s));
    const pdfs = files.filter(isPdf);
    const images = files.filter((f) => isImage(f) && !isPdf(f));
    const need = (ok: boolean, what: string) => {
      if (!ok) throw new Error(`Step ${i + 1} (${describeStep(s)}) needs ${what}, but there aren't any at that point.`);
    };
    switch (s.op) {
      case "heic_to_jpg": {
        const heic = files.filter(isHeic);
        need(heic.length > 0, "iPhone (HEIC) photos");
        const conv = (await Promise.all(heic.map((f) => img.heicToImage(f, "image/jpeg")))).flat();
        outs = [...conv, ...files.filter((f) => !isHeic(f)).map((f) => ({ blob: f, name: f.name, checks: [] }))];
        break;
      }
      case "images_to_pdf":
        need(images.length > 0, "images");
        outs = [await pdf.imagesToPdf(images, { pageSize: s.page ?? "a4", margin: "small", name: stem })];
        break;
      case "merge_pdfs":
        need(pdfs.length > 0, "PDFs");
        outs = pdfs.length === 1 ? [{ blob: pdfs[0], name: pdfs[0].name, checks: [] }] : [await pdf.mergePdfs(pdfs, stem)];
        break;
      case "compress_pdf":
        need(pdfs.length > 0, "PDFs");
        outs = await Promise.all(pdfs.map((f) => pdf.compressPdf(f, s.level ?? "balanced")));
        break;
      case "pdf_under_size": {
        need(pdfs.length > 0, "PDFs");
        const target = s.target_kb * 1000;
        outs = [];
        for (const f of pdfs) {
          if (f.size <= target) {
            outs.push({ blob: f, name: f.name, checks: [`Already under ${s.target_kb >= 1000 ? `${s.target_kb / 1000} MB` : `${s.target_kb} KB`}`] });
            continue;
          }
          let o = await pdf.compressPdf(f, "balanced");
          if (o.blob.size > target) o = await pdf.compressPdf(f, "strong");
          if (o.blob.size > target) o.note = `${o.note ? `${o.note} ` : ""}This is as small as it gets without losing readability; it's still over the size you asked for.`;
          outs.push(o);
        }
        break;
      }
      case "compress_image":
        need(images.length > 0, "images");
        outs = await Promise.all(
          images.map((f) => img.compressImage(f, { targetBytes: s.target_kb * 1000, quality: 0.8, format: "auto", targetLabel: `${s.target_kb} KB` })),
        );
        break;
      case "resize_image":
        need(images.length > 0, "images");
        outs = await Promise.all(
          images.map(async (f) => {
            const { w, h } = await img.imageSize(f);
            const width = s.width || Math.round(((s.height || h) * w) / h);
            const height = s.height || Math.round(((s.width || w) * h) / w);
            return img.resizeImage(f, { width, height, mode: s.width && s.height ? "fit" : "stretch", format: "same" });
          }),
        );
        break;
      case "convert_image":
        need(images.length > 0, "images");
        outs = await Promise.all(images.map((f) => img.convertImage(f, MIME[s.format] ?? "image/jpeg")));
        break;
      case "split_pdf":
        need(pdfs.length > 0, "a PDF");
        outs = await pdf.splitPdf(pdfs[0], "extract", { ranges: s.ranges, n: 1 });
        break;
      case "pdf_to_images":
        need(pdfs.length > 0, "a PDF");
        outs = (await Promise.all(pdfs.map((f) => pdf.pdfToImages(f, { dpi: 150, format: s.format === "png" ? "image/png" : "image/jpeg", ranges: null })))).flat();
        break;
      case "rotate_pdf":
        need(pdfs.length > 0, "a PDF");
        outs = await Promise.all(
          pdfs.map(async (f) => {
            const n = await pdf.pageCount(f);
            return pdf.organizePdf(f, Array.from({ length: n }, (_, index) => ({ index, rotate: s.degrees })));
          }),
        );
        break;
      case "add_page_numbers":
        need(pdfs.length > 0, "a PDF");
        outs = await Promise.all(pdfs.map((f) => pdf.addPageNumbers(f, { position: "bc", format: "n", start: 1, size: 11, skipFirst: false })));
        break;
      case "rename": {
        const clean = String(s.name).replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 80) || "readily";
        outs = files.map((f, k) => ({ blob: f, name: `${clean}${files.length > 1 ? ` ${k + 1}` : ""}.${f.name.split(".").pop()}`, checks: [] }));
        break;
      }
      default:
        throw new Error("The assistant suggested a step Readily can't do yet.");
    }
    files = toFiles(outs);
  }
  report(1, "Done");
  return outs.map((o) => ({ ...o, checks: o.checks.length ? o.checks : ["Ready"] }));
}
