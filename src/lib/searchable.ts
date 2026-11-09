// Scan to searchable PDF: tesseract.js reads each page in any of 100+ languages and
// Readily lays its invisible text over the original page, so the PDF looks the same.
import type { Worker } from "tesseract.js";
import { baseName, formatBytes, isPdf, type Output } from "./files";

/** Tesseract language codes with their names (traineddata from tesseract-ocr/tessdata). */
export const OCR_LANGUAGES: [string, string][] = [
  ["eng", "English"], ["fas", "Persian (Farsi, Dari)"], ["pus", "Pashto"], ["ara", "Arabic"], ["urd", "Urdu"],
  ["tur", "Turkish"], ["fra", "French"], ["spa", "Spanish"], ["deu", "German"], ["ita", "Italian"], ["por", "Portuguese"],
  ["rus", "Russian"], ["ukr", "Ukrainian"], ["chi_sim", "Chinese (Simplified)"], ["chi_tra", "Chinese (Traditional)"],
  ["jpn", "Japanese"], ["kor", "Korean"], ["hin", "Hindi"], ["ben", "Bengali"], ["pan", "Punjabi"], ["tgk", "Tajik"],
  ["uzb", "Uzbek"], ["uzb_cyrl", "Uzbek (Cyrillic)"], ["kmr", "Kurdish (Kurmanji)"], ["heb", "Hebrew"], ["ind", "Indonesian"],
  ["msa", "Malay"], ["vie", "Vietnamese"], ["tha", "Thai"], ["nld", "Dutch"], ["pol", "Polish"], ["swe", "Swedish"],
  ["nor", "Norwegian"], ["dan", "Danish"], ["fin", "Finnish"], ["ces", "Czech"], ["slk", "Slovak"], ["hun", "Hungarian"],
  ["ron", "Romanian"], ["bul", "Bulgarian"], ["ell", "Greek"], ["srp", "Serbian (Cyrillic)"], ["srp_latn", "Serbian (Latin)"],
  ["hrv", "Croatian"], ["bos", "Bosnian"], ["slv", "Slovenian"], ["mkd", "Macedonian"], ["sqi", "Albanian"], ["lit", "Lithuanian"],
  ["lav", "Latvian"], ["est", "Estonian"], ["bel", "Belarusian"], ["kaz", "Kazakh"], ["kir", "Kyrgyz"], ["aze", "Azerbaijani"],
  ["aze_cyrl", "Azerbaijani (Cyrillic)"], ["hye", "Armenian"], ["kat", "Georgian"], ["mon", "Mongolian"], ["tat", "Tatar"],
  ["uig", "Uyghur"], ["snd", "Sindhi"], ["nep", "Nepali"], ["mar", "Marathi"], ["guj", "Gujarati"], ["tam", "Tamil"],
  ["tel", "Telugu"], ["kan", "Kannada"], ["mal", "Malayalam"], ["sin", "Sinhala"], ["ori", "Odia"], ["asm", "Assamese"],
  ["mya", "Burmese"], ["khm", "Khmer"], ["lao", "Lao"], ["bod", "Tibetan"], ["dzo", "Dzongkha"], ["amh", "Amharic"],
  ["tir", "Tigrinya"], ["swa", "Swahili"], ["yor", "Yoruba"], ["afr", "Afrikaans"],
  ["fil", "Filipino"], ["ceb", "Cebuano"], ["jav", "Javanese"], ["sun", "Sundanese"], ["cat", "Catalan"], ["eus", "Basque"],
  ["glg", "Galician"], ["gle", "Irish"], ["gla", "Scottish Gaelic"], ["cym", "Welsh"], ["bre", "Breton"], ["isl", "Icelandic"],
  ["fao", "Faroese"], ["ltz", "Luxembourgish"], ["mlt", "Maltese"], ["epo", "Esperanto"], ["lat", "Latin"], ["grc", "Ancient Greek"],
  ["yid", "Yiddish"], ["syr", "Syriac"], ["div", "Dhivehi"], ["chr", "Cherokee"], ["iku", "Inuktitut"], ["hat", "Haitian Creole"],
  ["que", "Quechua"], ["mri", "Maori"], ["ton", "Tongan"], ["oci", "Occitan"], ["cos", "Corsican"], ["fry", "Frisian"],
  ["san", "Sanskrit"], ["frk", "German (Fraktur)"], ["enm", "Middle English"], ["frm", "Middle French"], ["ita_old", "Italian (old)"],
  ["spa_old", "Spanish (old)"], ["kat_old", "Georgian (old)"],
];

let current: { key: string; worker: Promise<Worker> } | null = null;
let progressCb: ((p: number) => void) | null = null;

async function workerFor(langs: string[], onStatus: (s: string) => void): Promise<Worker> {
  const key = langs.join("+");
  if (current?.key === key) return current.worker;
  if (current) (await current.worker.catch(() => null))?.terminate();
  onStatus("Downloading the language data (first time only)");
  const w = (async () => {
    const T = await import("tesseract.js");
    // English comes from Readily itself; other languages from the tessdata mirror on jsDelivr.
    const onlyEnglish = key === "eng";
    return T.createWorker(langs, 1, {
      workerPath: "/vendor/tesseract/worker.min.js",
      corePath: "/vendor/tesseract/core",
      ...(onlyEnglish ? { langPath: "/vendor/tesseract/lang" } : {}),
      gzip: true,
      workerBlobURL: false,
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text") progressCb?.(m.progress);
      },
    });
  })();
  current = { key, worker: w };
  w.catch(() => {
    if (current?.key === key) current = null;
  });
  return w;
}

async function ocrPdf(worker: Worker, source: HTMLCanvasElement | File, dpi: number, textOnly: boolean): Promise<Uint8Array> {
  await worker.setParameters({ user_defined_dpi: String(Math.round(dpi)) });
  const { data } = await worker.recognize(source, { pdfTitle: "Readily", pdfTextOnly: textOnly }, { pdf: true, text: true });
  if (!data.pdf) throw new Error("The text layer couldn't be created.");
  return new Uint8Array(data.pdf as ArrayLike<number>);
}

export async function makeSearchable(files: File[], langs: string[], report: (p: number, label?: string) => void): Promise<Output> {
  if (!langs.length) throw new Error("Pick at least one language.");
  const worker = await workerFor(langs, (s) => report(0.01, s));
  const { PDFDocument } = await import("pdf-lib");
  const out = await PDFDocument.create();
  let pages = 0;
  const total = files.length;
  for (let f = 0; f < total; f++) {
    const file = files[f];
    if (isPdf(file)) {
      const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const { openPdf, renderPage } = await import("./pdf-render");
      const doc = await openPdf(file);
      const copied = await out.copyPages(src, src.getPageIndices());
      for (let p = 1; p <= doc.numPages; p++) {
        progressCb = (x) => report((f + (p - 1 + x) / doc.numPages) / total, `Reading ${file.name}, page ${p} of ${doc.numPages}`);
        const page = copied[p - 1];
        const view = (await doc.getPage(p)).getViewport({ scale: 1 });
        // About 200 dpi, enough for small print, capped for phones.
        const scale = Math.min(200 / 72, 3200 / Math.max(view.width, view.height));
        const canvas = await renderPage(doc, p, scale);
        const rotated = page.getRotation().angle % 360 !== 0;
        if (rotated) {
          // Rotated pages: use the scanned image with its text, already the right way up.
          const full = await PDFDocument.load(await ocrPdf(worker, canvas, 72 * scale, false));
          const [img] = await out.copyPages(full, [0]);
          const { width, height } = img.getSize();
          img.scale(view.width / width, view.height / height);
          out.addPage(img);
        } else {
          const layer = await PDFDocument.load(await ocrPdf(worker, canvas, 72 * scale, true));
          const [embedded] = await out.embedPdf(layer, [0]);
          const { width, height } = page.getSize();
          const box = page.getMediaBox();
          page.drawPage(embedded, { x: box.x, y: box.y, width, height });
          out.addPage(page);
        }
        canvas.width = canvas.height = 0;
        pages++;
      }
      await doc.loadingTask.destroy();
    } else {
      progressCb = (x) => report((f + x) / total, `Reading ${file.name}`);
      const full = await PDFDocument.load(await ocrPdf(worker, file, 150, false));
      const [pg] = await out.copyPages(full, [0]);
      // Fit to A4 width so photos of pages print at a normal size.
      const { width } = pg.getSize();
      const k = 595.28 / width;
      pg.scale(k, k);
      out.addPage(pg);
      pages++;
    }
  }
  progressCb = null;
  const bytes = await out.save({ useObjectStreams: true });
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const names = langs.map((l) => OCR_LANGUAGES.find(([c]) => c === l)?.[1] ?? l).join(" + ");
  return {
    blob,
    name: `${total === 1 ? baseName(files[0].name) : "readily-scans"} (searchable).pdf`,
    checks: [`${pages} ${pages === 1 ? "page" : "pages"} searchable`, names, "Pages look the same", formatBytes(blob.size)],
  };
}
