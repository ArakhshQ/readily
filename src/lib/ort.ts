// ONNX Runtime Web, served from Readily's own copy (public/vendor/ort). Runs the
// background remover and object eraser models on the user's device.
type Ort = typeof import("onnxruntime-web");

let ortP: Promise<Ort> | null = null;
const sessions = new Map<string, Promise<import("onnxruntime-web").InferenceSession>>();

function abs(path: string) {
  return new URL(path, window.location.origin).href;
}

export function loadOrt(): Promise<Ort> {
  if (!ortP) {
    ortP = (async () => {
      const ort = (await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ abs("/vendor/ort/ort.wasm.min.mjs"))) as Ort;
      ort.env.wasm.wasmPaths = abs("/vendor/ort/");
      // Multi-threading needs special server headers; one thread works everywhere.
      ort.env.wasm.numThreads = 1;
      // Run inference in a worker so the page doesn't freeze.
      ort.env.wasm.proxy = true;
      return ort;
    })().catch((e) => {
      ortP = null;
      throw new Error(`The AI engine couldn't start in this browser. ${e instanceof Error ? e.message : ""}`.trim());
    });
  }
  return ortP;
}

export function session(modelPath: string) {
  let s = sessions.get(modelPath);
  if (!s) {
    s = loadOrt().then((ort) => ort.InferenceSession.create(abs(modelPath), { executionProviders: ["wasm"], graphOptimizationLevel: "all" }));
    s.catch(() => sessions.delete(modelPath));
    sessions.set(modelPath, s);
  }
  return s;
}
