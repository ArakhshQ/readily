// Reads the true length of uploaded audio and video, and the size of images, so
// credits are charged on the real file, not on what the browser claims.

const V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

/** Seconds of audio in an MPEG layer III file, by walking every frame. 0 if it isn't an MP3. */
export function mp3Duration(b: Uint8Array): number {
  let i = 0;
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) {
    const size = (b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9];
    i = 10 + size + (b[5] & 0x10 ? 10 : 0);
  }
  let samples = 0;
  let rate = 0;
  let frames = 0;
  let misses = 0;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) {
      i++;
      if (++misses > 65536) break;
      continue;
    }
    const ver = (b[i + 1] >> 3) & 3; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (b[i + 1] >> 1) & 3; // 1 = layer III
    const brIdx = (b[i + 2] >> 4) & 15;
    const srIdx = (b[i + 2] >> 2) & 3;
    const pad = (b[i + 2] >> 1) & 1;
    if (ver === 1 || layer !== 1 || brIdx === 0 || brIdx === 15 || srIdx === 3) {
      i++;
      continue;
    }
    const sr = RATES[ver][srIdx];
    const br = (ver === 3 ? V1_L3 : V2_L3)[brIdx] * 1000;
    const len = ver === 3 ? Math.floor((144 * br) / sr) + pad : Math.floor((72 * br) / sr) + pad;
    if (len < 4) {
      i++;
      continue;
    }
    samples += ver === 3 ? 1152 : 576;
    rate = sr;
    frames++;
    i += len;
  }
  return frames > 2 && rate ? samples / rate : 0;
}

function u32(b: Uint8Array, o: number) {
  return ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
}
function u64(b: Uint8Array, o: number) {
  return u32(b, o) * 2 ** 32 + u32(b, o + 4);
}
function type(b: Uint8Array, o: number) {
  return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
}

function findBox(b: Uint8Array, start: number, end: number, name: string): [number, number] | null {
  let o = start;
  while (o + 8 <= end) {
    let size = u32(b, o);
    let header = 8;
    if (size === 1) {
      size = u64(b, o + 8);
      header = 16;
    } else if (size === 0) size = end - o;
    if (size < header) return null;
    if (type(b, o + 4) === name) return [o + header, Math.min(end, o + size)];
    o += size;
  }
  return null;
}

/** Seconds of video in an MP4 / MOV file, from its movie header. 0 if it can't be read. */
export function mp4Duration(b: Uint8Array): number {
  const moov = findBox(b, 0, b.length, "moov");
  if (!moov) return 0;
  const mvhd = findBox(b, moov[0], moov[1], "mvhd");
  if (!mvhd) return 0;
  const o = mvhd[0];
  const version = b[o];
  const scale = version === 1 ? u32(b, o + 20) : u32(b, o + 12);
  const dur = version === 1 ? u64(b, o + 24) : u32(b, o + 16);
  return scale ? dur / scale : 0;
}

/** Width and height of a PNG, JPEG or WebP image. */
export function imageSize(b: Uint8Array): { width: number; height: number; type: string } | null {
  if (b[0] === 0x89 && type(b, 1) === "PNG\r") return { width: u32(b, 16), height: u32(b, 20), type: "image/png" };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) {
        o++;
        continue;
      }
      const m = b[o + 1];
      const len = (b[o + 2] << 8) + b[o + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { height: (b[o + 5] << 8) + b[o + 6], width: (b[o + 7] << 8) + b[o + 8], type: "image/jpeg" };
      }
      o += 2 + len;
    }
    return null;
  }
  if (type(b, 0) === "RIFF" && type(b, 8) === "WEBP") {
    const kind = type(b, 12);
    if (kind === "VP8 ") return { width: ((b[27] << 8) | b[26]) & 0x3fff, height: ((b[29] << 8) | b[28]) & 0x3fff, type: "image/webp" };
    if (kind === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, type: "image/webp" };
    }
    if (kind === "VP8X") return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)), type: "image/webp" };
  }
  return null;
}
