// On-device photo upscaler: ESRGAN (UpscalerJS, MIT) running on TensorFlow.js.
import { baseName, canvasToBlob, formatBytes, loadImage, type Output } from "./files";

export type Scale = 2 | 4;
/** Longest side going in, so results stay within what phones can handle. */
export const MAX_IN: Record<Scale, number> = { 2: 2000, 4: 1000 };

type UpscalerT = { upscale: (img: HTMLCanvasElement, o: object) => Promise<string>; dispose: () => Promise<void> };
const cache = new Map<Scale, Promise<UpscalerT>>();

async function getUpscaler(scale: Scale): Promise<UpscalerT> {
  let u = cache.get(scale);
  if (!u) {
    u = (async () => {
      const [tf, { default: Upscaler }, def] = await Promise.all([
        import("@tensorflow/tfjs"),
        import("upscaler"),
        scale === 2 ? import("@upscalerjs/esrgan-medium/2x") : import("@upscalerjs/esrgan-medium/4x"),
      ]);
      await tf.ready();
      const model = { ...(def.default as object), path: new URL(`/vendor/esrgan/x${scale}/model.json`, window.location.origin).href };
      return new Upscaler({ model }) as unknown as UpscalerT;
    })();
    u.catch(() => cache.delete(scale));
    cache.set(scale, u);
  }
  return u;
}

export async function upscalePhoto(file: File, scale: Scale, report: (p: number, label?: string) => void): Promise<Output> {
  const img = await loadImage(file);
  const max = MAX_IN[scale];
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * k));
  c.height = Math.max(1, Math.round(img.height * k));
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  report(0.02, "Loading the upscaler (first time only, about 3 MB)");
  const up = await getUpscaler(scale);
  report(0.05, "Upscaling");
  const dataUrl = await up.upscale(c, {
    patchSize: 64,
    padding: 4,
    awaitNextFrame: true,
    progress: (p: number) => report(0.05 + p * 0.9, "Upscaling"),
  });
  const out = await loadImage(await (await fetch(dataUrl)).blob());
  const oc = document.createElement("canvas");
  oc.width = out.width;
  oc.height = out.height;
  oc.getContext("2d")!.drawImage(out, 0, 0);
  const png = /png/i.test(file.type);
  const blob = await canvasToBlob(oc, png ? "image/png" : "image/jpeg", png ? undefined : 0.93);
  const notes = k < 1 ? `Your photo was first fitted to ${c.width} × ${c.height} so it could be upscaled on this device.` : undefined;
  return {
    blob,
    name: `${baseName(file.name)} (${scale}x).${png ? "png" : "jpg"}`,
    checks: [`${scale}x bigger`, `${oc.width} × ${oc.height}`, formatBytes(blob.size)],
    note: notes,
  };
}
