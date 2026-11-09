// Copies the in-browser engines (PDF rendering, OCR, video) from node_modules
// into public/vendor so Readily serves them itself. Runs before dev and build.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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

// ONNX Runtime (runs the background remover and object eraser models)
for (const f of ["ort.wasm.min.mjs", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
  copy(nm(`onnxruntime-web/dist/${f}`), out(`ort/${f}`));
}

// Object eraser: MI-GAN inpainting pipeline (Picsart AI Research, MIT)
copy(nm("migan-onnx/models/migan_pipeline_v2.onnx"), out("models/migan.onnx"));

// Voice noise remover: DeepFilterNet3 (MIT / Apache-2.0), model baked into the wasm
copy(nm("@lofcz/deepfilternet-web/dist/index.js"), out("dfn/index.js"));
copy(nm("@lofcz/deepfilternet-web/dist/df_bg.wasm"), out("dfn/df_bg.wasm"));

// Photo upscaler: ESRGAN medium x2 and x4 (UpscalerJS, MIT)
for (const s of ["x2", "x4"]) copy(nm(`@upscalerjs/esrgan-medium/models/${s}`), out(`esrgan/${s}`));

// Protect / unlock PDF: qpdf (Apache-2.0)
copy(nm("@neslinesli93/qpdf-wasm/dist/qpdf.js"), out("qpdf/qpdf.js"));
copy(nm("@neslinesli93/qpdf-wasm/dist/qpdf.wasm"), out("qpdf/qpdf.wasm"));

// Background remover: Silueta, a compact U2-Net (Apache-2.0) published by rembg (MIT).
// Too big for npm, so it's downloaded once from the rembg GitHub release and cached.
const MODELS = [
  {
    name: "silueta.onnx",
    url: "https://github.com/danielgatis/rembg/releases/download/v0.0.0/silueta.onnx",
    sha256: "75da6c8d2f8096ec743d071951be73b4a8bc7b3e51d9a6625d63644f90ffeedb",
  },
];
const cache = nm(".cache/readily-models");
mkdirSync(cache, { recursive: true });
for (const m of MODELS) {
  const file = join(cache, m.name);
  const ok = () => existsSync(file) && createHash("sha256").update(readFileSync(file)).digest("hex") === m.sha256;
  if (!ok()) {
    console.log(`downloading ${m.name}`);
    const res = await fetch(m.url);
    if (!res.ok) throw new Error(`couldn't download ${m.name}: HTTP ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    if (!ok()) throw new Error(`${m.name} failed its checksum`);
  }
  copy(file, out(`models/${m.name}`));
}

if (!existsSync(out("ffmpeg/core/ffmpeg-core.wasm"))) throw new Error("vendor copy failed");
console.log("vendor files copied to public/vendor");
