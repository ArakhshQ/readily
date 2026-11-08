// Copies the in-browser engines (PDF rendering, OCR, video) from node_modules
// into public/vendor so Readily serves them itself. Runs before dev and build.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = (p) => join(root, "node_modules", p);
const out = (p) => join(root, "public", "vendor", p);

rmSync(out(""), { recursive: true, force: true });

function copy(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

// PDF rendering (pdf.js worker)
copy(nm("pdfjs-dist/build/pdf.worker.min.mjs"), out("pdfjs/pdf.worker.min.mjs"));

// OCR (tesseract.js worker, wasm core, English language data)
copy(nm("tesseract.js/dist/worker.min.js"), out("tesseract/worker.min.js"));
for (const f of readdirSync(nm("tesseract.js-core"))) {
  if (/^tesseract-core.*lstm\.wasm\.js$/.test(f)) copy(nm(`tesseract.js-core/${f}`), out(`tesseract/core/${f}`));
}
copy(nm("@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz"), out("tesseract/lang/eng.traineddata.gz"));

// Video and audio (ffmpeg.wasm: class worker + single-thread core)
copy(nm("@ffmpeg/ffmpeg/dist/esm"), out("ffmpeg/esm"));
copy(nm("@ffmpeg/core/dist/esm/ffmpeg-core.js"), out("ffmpeg/core/ffmpeg-core.js"));
copy(nm("@ffmpeg/core/dist/esm/ffmpeg-core.wasm"), out("ffmpeg/core/ffmpeg-core.wasm"));

if (!existsSync(out("ffmpeg/core/ffmpeg-core.wasm"))) throw new Error("vendor copy failed");
console.log("vendor files copied to public/vendor");
