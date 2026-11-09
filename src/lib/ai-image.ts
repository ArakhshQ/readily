// On-device image AI: background removal (Silueta / U2-Net) and object erasing (MI-GAN).
import { loadOrt, session } from "./ort";
import { baseName, canvasToBlob, formatBytes, loadImage, type Output } from "./files";

const MAX_SIDE = 4096;

function canvasFor(img: CanvasImageSource & { width: number; height: number }, maxSide = MAX_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.width * scale));
  c.height = Math.max(1, Math.round(img.height * scale));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return { c, ctx };
}

// ---------------------------------------------------------------- background removal

const SIZE = 320;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/** Alpha mask (0-255) for the main subject, at the image's own size. */
export async function subjectMask(source: HTMLCanvasElement, onStatus?: (s: string) => void): Promise<Uint8ClampedArray> {
  onStatus?.("Loading the background remover (first time only, about 44 MB)");
  const [ort, sess] = await Promise.all([loadOrt(), session("/vendor/models/silueta.onnx")]);
  onStatus?.("Finding the subject");
  const small = document.createElement("canvas");
  small.width = SIZE;
  small.height = SIZE;
  const sctx = small.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(source, 0, 0, SIZE, SIZE);
  const px = sctx.getImageData(0, 0, SIZE, SIZE).data;
  let max = 1e-6;
  for (let i = 0; i < px.length; i += 4) max = Math.max(max, px[i], px[i + 1], px[i + 2]);
  const input = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0, p = 0; i < SIZE * SIZE; i++, p += 4) {
    for (let ch = 0; ch < 3; ch++) input[ch * SIZE * SIZE + i] = (px[p + ch] / max - MEAN[ch]) / STD[ch];
  }
  const feeds = { [sess.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]) };
  const res = await sess.run(feeds);
  const pred = res[sess.outputNames[0]].data as Float32Array;
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of pred) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const range = hi - lo || 1;
  // Small mask image, then let the browser scale it up smoothly.
  const m = document.createElement("canvas");
  m.width = SIZE;
  m.height = SIZE;
  const mctx = m.getContext("2d")!;
  const mid = mctx.createImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const a = Math.round(((pred[i] - lo) / range) * 255);
    mid.data[i * 4] = mid.data[i * 4 + 1] = mid.data[i * 4 + 2] = 255;
    mid.data[i * 4 + 3] = a;
  }
  mctx.putImageData(mid, 0, 0);
  const big = document.createElement("canvas");
  big.width = source.width;
  big.height = source.height;
  const bctx = big.getContext("2d", { willReadFrequently: true })!;
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(m, 0, 0, big.width, big.height);
  const alpha = bctx.getImageData(0, 0, big.width, big.height).data;
  const out = new Uint8ClampedArray(big.width * big.height);
  // Firm up the edges a little: near-transparent goes fully clear, near-solid fully solid.
  for (let i = 0; i < out.length; i++) {
    const a = alpha[i * 4 + 3];
    out[i] = a < 12 ? 0 : a > 243 ? 255 : Math.round(((a - 12) / 231) * 255);
  }
  return out;
}

export type BgChoice = { kind: "transparent" } | { kind: "color"; color: string };

export async function removeBackground(file: File, bg: BgChoice, onStatus?: (s: string) => void): Promise<Output> {
  const img = await loadImage(file);
  const { c, ctx } = canvasFor(img);
  const mask = await subjectMask(c, onStatus);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < mask.length; i++) data.data[i * 4 + 3] = mask[i];
  ctx.putImageData(data, 0, 0);
  let out = c;
  if (bg.kind === "color") {
    out = document.createElement("canvas");
    out.width = c.width;
    out.height = c.height;
    const o = out.getContext("2d")!;
    o.fillStyle = bg.color;
    o.fillRect(0, 0, out.width, out.height);
    o.drawImage(c, 0, 0);
  }
  const png = bg.kind === "transparent";
  const blob = await canvasToBlob(out, png ? "image/png" : "image/jpeg", png ? undefined : 0.92);
  const kept = mask.reduce((n, a) => n + (a > 127 ? 1 : 0), 0) / mask.length;
  return {
    blob,
    name: `${baseName(file.name)} (no background).${png ? "png" : "jpg"}`,
    checks: [png ? "Transparent PNG" : `JPG on ${bg.color}`, `${out.width} × ${out.height}`, `Subject fills ${Math.round(kept * 100)}%`, formatBytes(blob.size)],
  };
}

// ---------------------------------------------------------------- object eraser

/**
 * Fills the painted area (alpha > 0 in `paint`) to match the photo. Works on the
 * region around the paint, so large photos stay sharp and fast.
 */
export async function eraseRegion(image: HTMLCanvasElement, paint: HTMLCanvasElement, onStatus?: (s: string) => void): Promise<HTMLCanvasElement> {
  onStatus?.("Loading the eraser (first time only, about 28 MB)");
  const [ort, sess] = await Promise.all([loadOrt(), session("/vendor/models/migan.onnx")]);
  const W = image.width;
  const H = image.height;
  const pctx = paint.getContext("2d", { willReadFrequently: true })!;
  const pd = pctx.getImageData(0, 0, W, H).data;
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (pd[(y * W + x) * 4 + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("Paint over what you want to erase first.");
  // Give the model plenty of surrounding context, then work at up to 1024 px.
  const pad = Math.max(64, Math.round(Math.max(x1 - x0, y1 - y0) * 1.2));
  const cx0 = Math.max(0, x0 - pad);
  const cy0 = Math.max(0, y0 - pad);
  const cx1 = Math.min(W, x1 + pad + 1);
  const cy1 = Math.min(H, y1 + pad + 1);
  const cw = cx1 - cx0;
  const ch = cy1 - cy0;
  const s = Math.min(1, 1024 / Math.max(cw, ch));
  const w = Math.max(8, Math.round(cw * s));
  const h = Math.max(8, Math.round(ch * s));
  const crop = document.createElement("canvas");
  crop.width = w;
  crop.height = h;
  const cctx = crop.getContext("2d", { willReadFrequently: true })!;
  cctx.drawImage(image, cx0, cy0, cw, ch, 0, 0, w, h);
  const mcan = document.createElement("canvas");
  mcan.width = w;
  mcan.height = h;
  const mctx = mcan.getContext("2d", { willReadFrequently: true })!;
  mctx.drawImage(paint, cx0, cy0, cw, ch, 0, 0, w, h);
  const ip = cctx.getImageData(0, 0, w, h).data;
  const mp = mctx.getImageData(0, 0, w, h).data;
  const img = new Uint8Array(3 * w * h);
  const msk = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    img[i] = ip[i * 4];
    img[w * h + i] = ip[i * 4 + 1];
    img[2 * w * h + i] = ip[i * 4 + 2];
    // MI-GAN: 255 = keep, 0 = fill in.
    msk[i] = mp[i * 4 + 3] > 0 ? 0 : 255;
  }
  onStatus?.("Erasing");
  const res = await sess.run({
    image: new ort.Tensor("uint8", img, [1, 3, h, w]),
    mask: new ort.Tensor("uint8", msk, [1, 1, h, w]),
  });
  const r = res[sess.outputNames[0]].data as Uint8Array;
  const outCrop = cctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    outCrop.data[i * 4] = r[i];
    outCrop.data[i * 4 + 1] = r[w * h + i];
    outCrop.data[i * 4 + 2] = r[2 * w * h + i];
    outCrop.data[i * 4 + 3] = 255;
  }
  cctx.putImageData(outCrop, 0, 0);
  // Paste back only the painted pixels (slightly feathered), so the rest stays untouched.
  const result = document.createElement("canvas");
  result.width = W;
  result.height = H;
  const rctx = result.getContext("2d")!;
  rctx.drawImage(image, 0, 0);
  const patch = document.createElement("canvas");
  patch.width = cw;
  patch.height = ch;
  const ptx = patch.getContext("2d")!;
  ptx.drawImage(crop, 0, 0, w, h, 0, 0, cw, ch);
  ptx.globalCompositeOperation = "destination-in";
  ptx.filter = "blur(2px)";
  ptx.drawImage(paint, cx0, cy0, cw, ch, 0, 0, cw, ch);
  rctx.drawImage(patch, cx0, cy0);
  return result;
}

export { canvasFor };
