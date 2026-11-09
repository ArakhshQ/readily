// Voice noise remover: DeepFilterNet3 in a worker (public/workers/denoise.js).
import { decodeMono48k, deliverAudio, samplesToWav } from "./media";
import type { Output } from "./files";

export type Strength = "natural" | "strong";

function denoiseSamples(samples: Float32Array, strength: Strength, onProgress: (p: number) => void): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const w = new Worker("/workers/denoise.js", { type: "module" });
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progress") onProgress(m.value);
      else if (m.type === "done") {
        w.terminate();
        resolve(m.samples as Float32Array);
      } else if (m.type === "error") {
        w.terminate();
        reject(new Error(`The noise remover couldn't run in this browser (${m.message}).`));
      }
    };
    w.onerror = (e) => {
      w.terminate();
      reject(new Error(`The noise remover couldn't start in this browser. ${e.message || ""}`.trim()));
    };
    // "Natural" keeps a little room tone so voices don't sound cut out.
    w.postMessage({ samples, attenuation: strength === "strong" ? 100 : 24 }, [samples.buffer]);
  });
}

export async function removeNoise(file: File, strength: Strength, duration: number, report: (p: number, label?: string) => void): Promise<Output> {
  const samples = await decodeMono48k(file, duration, (p, l) => report(p * 0.15, l));
  report(0.15, "Loading the noise remover (first time only, about 34 MB)");
  const clean = await denoiseSamples(samples, strength, (p) => report(0.15 + p * 0.7, "Removing background noise"));
  const wav = samplesToWav(clean);
  return deliverAudio(file, wav, "clean.wav", "clean", duration, (p, l) => report(0.85 + p * 0.15, l));
}
