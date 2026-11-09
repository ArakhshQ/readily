// Video and audio processing with ffmpeg.wasm, served from Readily itself.
// The engine (about 30 MB) downloads once on first use, then the browser caches it.
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { baseName, formatBytes, formatTime, type Output } from "./files";

let instance: Promise<FFmpeg> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function abs(path: string) {
  return new URL(path, window.location.origin).href;
}

async function engine(): Promise<FFmpeg> {
  if (!instance) {
    instance = (async () => {
      // Loaded from Readily's own copy (public/vendor) instead of the bundle,
      // because the library builds its worker URL at runtime.
      const mod = (await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ abs("/vendor/ffmpeg/esm/index.js"))) as {
        FFmpeg: new () => FFmpeg;
      };
      const ff = new mod.FFmpeg();
      await ff.load({
        coreURL: abs("/vendor/ffmpeg/core/ffmpeg-core.js"),
        wasmURL: abs("/vendor/ffmpeg/core/ffmpeg-core.wasm"),
        classWorkerURL: abs("/vendor/ffmpeg/esm/worker.js"),
      });
      return ff;
    })().catch((e) => {
      instance = null;
      throw new Error(`The video engine couldn't start in this browser. ${e instanceof Error ? e.message : ""}`.trim());
    });
  }
  return instance;
}

/** Facts about a video or audio file, read by the browser itself. */
export function probe(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v)$/i.test(file.name);
    const el = document.createElement(isVideo ? "video" : "audio") as HTMLVideoElement;
    const url = URL.createObjectURL(file);
    const done = (d: number, w = 0, h = 0) => {
      URL.revokeObjectURL(url);
      resolve({ duration: isFinite(d) ? d : 0, width: w, height: h });
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(el.duration, el.videoWidth || 0, el.videoHeight || 0);
    el.onerror = () => done(0);
    el.src = url;
    setTimeout(() => done(0), 8000);
  });
}

interface Job {
  file: File;
  args: (input: string, output: string) => string[];
  outExt: string;
  outMime: string;
  /** Expected length of the output in seconds, for progress. */
  expected: number;
  onProgress?: (p: number, label: string) => void;
  label: string;
}

/** Runs one ffmpeg job. Jobs queue up so the single engine never runs two at once. */
function run(job: Job): Promise<Blob> {
  const task = queue.then(async () => {
    job.onProgress?.(0, "Loading the video engine (first time only)");
    const ff = await engine();
    const ext = (job.file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const input = `in.${ext}`;
    const output = `out.${job.outExt}`;
    const onProg = ({ time }: { time: number }) => {
      // time is in microseconds of output written so far.
      const sec = time / 1_000_000;
      if (job.expected > 0 && sec > 0) job.onProgress?.(Math.min(0.99, sec / job.expected), job.label);
    };
    let lastLog = "";
    const onLog = ({ message }: { message: string }) => {
      if (/error|invalid|not supported|could not/i.test(message)) lastLog = message;
    };
    ff.on("progress", onProg);
    ff.on("log", onLog);
    try {
      job.onProgress?.(0.01, job.label);
      await ff.writeFile(input, new Uint8Array(await job.file.arrayBuffer()));
      const code = await ff.exec(job.args(input, output));
      if (code !== 0) throw new Error(lastLog || "processing failed");
      const data = (await ff.readFile(output)) as Uint8Array;
      if (!data.length) throw new Error("the result was empty");
      return new Blob([data as BlobPart], { type: job.outMime });
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      throw new Error(`${job.file.name} couldn't be processed (${why.slice(0, 140)}). The file may be damaged or use a format this browser can't decode.`);
    } finally {
      ff.off("progress", onProg);
      ff.off("log", onLog);
      await ff.deleteFile(input).catch(() => {});
      await ff.deleteFile(output).catch(() => {});
    }
  });
  queue = task.catch(() => {});
  return task;
}

const sec = (n: number) => n.toFixed(3);

// ---------------------------------------------------------------- video

export async function trimVideo(file: File, start: number, end: number, exact: boolean, onProgress?: Job["onProgress"]): Promise<Output> {
  const dur = Math.max(0.1, end - start);
  if (!exact) {
    // Fast cut copies the video as-is, which can only start on a keyframe. If the
    // result is noticeably off, redo it precisely so the clip is what was asked for.
    const fast = await trimVideoOnce(file, start, end, false, onProgress);
    const got = (await probe(new File([fast.blob], fast.name, { type: fast.blob.type }))).duration;
    if (got && Math.abs(got - dur) <= 1) return fast;
    const precise = await trimVideoOnce(file, start, end, true, onProgress);
    return { ...precise, note: "This video has few keyframes, so Readily re-cut it precisely to match your start and end times." };
  }
  return trimVideoOnce(file, start, end, true, onProgress);
}

async function trimVideoOnce(file: File, start: number, end: number, exact: boolean, onProgress?: Job["onProgress"]): Promise<Output> {
  const dur = Math.max(0.1, end - start);
  const ext = exact ? "mp4" : (file.name.split(".").pop() || "mp4").toLowerCase();
  const mime = exact ? "video/mp4" : file.type || "video/mp4";
  const blob = await run({
    file,
    expected: dur,
    outExt: ext,
    outMime: mime,
    label: exact ? "Cutting exactly (re-encoding)" : "Cutting",
    onProgress,
    args: (i, o) =>
      exact
        ? ["-ss", sec(start), "-i", i, "-t", sec(dur), "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", o]
        : ["-ss", sec(start), "-i", i, "-t", sec(dur), "-c", "copy", "-avoid_negative_ts", "make_zero", o],
  });
  return {
    blob,
    name: `${baseName(file.name)} (trimmed).${ext}`,
    checks: [`${formatTime(dur)} long`, `from ${formatTime(start)} to ${formatTime(end)}`, formatBytes(blob.size)],
  };
}

export type VideoLevel = "high" | "balanced" | "small";
const LEVELS: Record<VideoLevel, { height: number; crf: number; audio: string; label: string }> = {
  high: { height: 1080, crf: 24, audio: "128k", label: "1080p" },
  balanced: { height: 720, crf: 28, audio: "96k", label: "720p" },
  small: { height: 480, crf: 32, audio: "64k", label: "480p" },
};

export async function compressVideo(file: File, level: VideoLevel, meta: { duration: number; height: number }, onProgress?: Job["onProgress"]): Promise<Output> {
  const L = LEVELS[level];
  const h = meta.height ? Math.min(meta.height, L.height) : L.height;
  const even = h - (h % 2);
  const blob = await run({
    file,
    expected: meta.duration,
    outExt: "mp4",
    outMime: "video/mp4",
    label: "Compressing video",
    onProgress,
    args: (i, o) => [
      "-i",
      i,
      "-vf",
      `scale=-2:${even}`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      String(L.crf),
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      L.audio,
      "-movflags",
      "+faststart",
      o,
    ],
  });
  if (blob.size >= file.size) {
    return {
      blob: file,
      name: file.name,
      checks: [formatBytes(file.size), "Original kept"],
      note: "This video is already well compressed, so the original was kept. Try \"Smallest\" or trim it first.",
    };
  }
  const saved = Math.round((1 - blob.size / file.size) * 100);
  return {
    blob,
    name: `${baseName(file.name)} (compressed).mp4`,
    checks: [`${saved}% smaller`, `${formatBytes(blob.size)} (was ${formatBytes(file.size)})`, `${even}p MP4`],
  };
}

// ---------------------------------------------------------------- audio

export type AudioFormat = "mp3" | "wav" | "m4a";
const AUDIO: Record<AudioFormat, { codec: string[]; mime: string; label: string }> = {
  mp3: { codec: ["-c:a", "libmp3lame"], mime: "audio/mpeg", label: "MP3" },
  wav: { codec: ["-c:a", "pcm_s16le"], mime: "audio/wav", label: "WAV" },
  m4a: { codec: ["-c:a", "aac"], mime: "audio/mp4", label: "M4A" },
};

export async function toAudio(
  file: File,
  format: AudioFormat,
  opts: { bitrate?: string; start?: number; end?: number; fadeIn?: number; fadeOut?: number; duration: number },
  onProgress?: Job["onProgress"],
): Promise<Output> {
  const A = AUDIO[format];
  const start = opts.start ?? 0;
  const end = opts.end ?? opts.duration;
  const trimmed = opts.start !== undefined || opts.end !== undefined;
  const dur = Math.max(0.1, (end || 0) - start) || opts.duration;
  const filters: string[] = [];
  if (opts.fadeIn) filters.push(`afade=t=in:st=0:d=${opts.fadeIn}`);
  if (opts.fadeOut && dur > opts.fadeOut) filters.push(`afade=t=out:st=${sec(dur - opts.fadeOut)}:d=${opts.fadeOut}`);
  const blob = await run({
    file,
    expected: dur,
    outExt: format,
    outMime: A.mime,
    label: trimmed ? "Cutting audio" : `Converting to ${A.label}`,
    onProgress,
    args: (i, o) => [
      ...(trimmed ? ["-ss", sec(start)] : []),
      "-i",
      i,
      ...(trimmed ? ["-t", sec(dur)] : []),
      "-vn",
      ...(filters.length ? ["-af", filters.join(",")] : []),
      ...A.codec,
      ...(format !== "wav" ? ["-b:a", opts.bitrate || "192k"] : []),
      o,
    ],
  });
  const checks = [A.label, `${formatTime(dur)} long`, formatBytes(blob.size)];
  if (format !== "wav") checks.splice(1, 0, `${(opts.bitrate || "192k").replace("k", " kbps")}`);
  return { blob, name: `${baseName(file.name)}${trimmed ? " (trimmed)" : ""}.${format}`, checks };
}

// ---------------------------------------------------------------- multi-input jobs

export interface FfInput {
  name: string;
  data: Blob | Uint8Array;
}

/** Runs ffmpeg with several input files and returns one output file. */
export function ffRun(opts: {
  inputs: FfInput[];
  args: string[];
  output: string;
  mime: string;
  expected?: number;
  label: string;
  onProgress?: (p: number, label: string) => void;
}): Promise<Blob> {
  const task = queue.then(async () => {
    opts.onProgress?.(0, "Loading the audio and video engine (first time only)");
    const ff = await engine();
    const onProg = ({ time }: { time: number }) => {
      const s = time / 1_000_000;
      if (opts.expected && s > 0) opts.onProgress?.(Math.min(0.99, s / opts.expected), opts.label);
    };
    let lastLog = "";
    const onLog = ({ message }: { message: string }) => {
      if (/error|invalid|not supported|could not|no such/i.test(message)) lastLog = message;
    };
    ff.on("progress", onProg);
    ff.on("log", onLog);
    try {
      for (const i of opts.inputs) {
        const bytes = i.data instanceof Blob ? new Uint8Array(await i.data.arrayBuffer()) : i.data;
        await ff.writeFile(i.name, bytes);
      }
      const code = await ff.exec(opts.args);
      if (code !== 0) throw new Error(lastLog || "processing failed");
      const data = (await ff.readFile(opts.output)) as Uint8Array;
      if (!data.length) throw new Error("the result was empty");
      return new Blob([data as BlobPart], { type: opts.mime });
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      throw new Error(`This file couldn't be processed (${why.slice(0, 160)}). It may be damaged or in a format this browser can't decode.`);
    } finally {
      ff.off("progress", onProg);
      ff.off("log", onLog);
      for (const i of opts.inputs) await ff.deleteFile(i.name).catch(() => {});
      await ff.deleteFile(opts.output).catch(() => {});
    }
  });
  queue = task.catch(() => {});
  return task;
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v|avi|3gp)$/i.test(file.name);
}

function inName(file: File, base = "in") {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${base}.${ext}`;
}

/** Decodes the sound of any audio or video file to 48 kHz mono samples. */
export async function decodeMono48k(file: File, duration: number, onProgress?: (p: number, label: string) => void): Promise<Float32Array> {
  const name = inName(file);
  const blob = await ffRun({
    inputs: [{ name, data: file }],
    args: ["-i", name, "-vn", "-ac", "1", "-ar", "48000", "-f", "f32le", "-c:a", "pcm_f32le", "out.raw"],
    output: "out.raw",
    mime: "application/octet-stream",
    expected: duration,
    label: "Reading the sound",
    onProgress,
  });
  return new Float32Array(await blob.arrayBuffer());
}

/** 48 kHz mono samples to a 16-bit WAV file. */
export function samplesToWav(samples: Float32Array, rate = 48000): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, "data");
  v.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

/**
 * Puts processed sound back where it came from: into the original video (picture
 * copied, not re-encoded), or into an audio file in the original format.
 */
export async function deliverAudio(
  original: File,
  audio: Blob,
  audioName: string,
  suffix: string,
  duration: number,
  onProgress?: (p: number, label: string) => void,
): Promise<Output> {
  const base = baseName(original.name);
  if (isVideoFile(original)) {
    const vin = inName(original, "video");
    const blob = await ffRun({
      inputs: [
        { name: vin, data: original },
        { name: audioName, data: audio },
      ],
      args: ["-i", vin, "-i", audioName, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", "out.mp4"],
      output: "out.mp4",
      mime: "video/mp4",
      expected: duration,
      label: "Putting the sound back into your video",
      onProgress,
    });
    return { blob, name: `${base} (${suffix}).mp4`, checks: ["Video picture unchanged", `${formatTime(duration)} long`, formatBytes(blob.size)] };
  }
  const blob = await ffRun({
    inputs: [{ name: audioName, data: audio }],
    args: ["-i", audioName, "-c:a", "libmp3lame", "-b:a", "192k", "out.mp3"],
    output: "out.mp3",
    mime: "audio/mpeg",
    expected: duration,
    label: "Saving as MP3",
    onProgress,
  });
  return { blob, name: `${base} (${suffix}).mp3`, checks: ["MP3, 192 kbps", `${formatTime(duration)} long`, formatBytes(blob.size)] };
}

/** Cuts pauses longer than `minPause` seconds quieter than `threshold` dB, keeping `keep` seconds of each. */
export async function removeSilences(
  file: File,
  opts: { minPause: number; threshold: number; keep: number; duration: number },
  onProgress?: (p: number, label: string) => void,
): Promise<Output> {
  const name = inName(file);
  const video = isVideoFile(file);
  const base = baseName(file.name);
  // Find the quiet stretches first, then keep everything else.
  const detectLog: string[] = [];
  const ff = await engine();
  const onLog = ({ message }: { message: string }) => {
    if (message.includes("silence_")) detectLog.push(message);
  };
  ff.on("log", onLog);
  try {
    await ffRun({
      inputs: [{ name, data: file }],
      args: ["-i", name, "-vn", "-af", `silencedetect=noise=${opts.threshold}dB:d=${opts.minPause}`, "-f", "null", "-"],
      output: "-",
      mime: "text/plain",
      expected: opts.duration,
      label: "Finding the pauses",
      onProgress,
    }).catch((e) => {
      // "-" isn't a readable file; detection still ran if the log has results.
      if (!detectLog.length && !/result was empty|couldn't be processed/.test(String(e))) throw e;
    });
  } finally {
    ff.off("log", onLog);
  }
  const starts = detectLog.map((l) => l.match(/silence_start: ([\d.]+)/)?.[1]).filter(Boolean).map(Number);
  const ends = detectLog.map((l) => l.match(/silence_end: ([\d.]+)/)?.[1]).filter(Boolean).map(Number);
  const cuts: [number, number][] = [];
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i] + opts.keep / 2;
    const e = (ends[i] ?? opts.duration) - opts.keep / 2;
    if (e - s > 0.05) cuts.push([s, e]);
  }
  if (!cuts.length) throw new Error("No pauses long enough to cut were found. Try a shorter pause length or a higher threshold.");
  const removed = cuts.reduce((t, [s, e]) => t + (e - s), 0);
  const keepExpr = cuts.map(([s, e]) => `between(t,${s.toFixed(3)},${e.toFixed(3)})`).join("+");
  const sel = `not(${keepExpr})`;
  const out = video ? "out.mp4" : "out.mp3";
  const args = video
    ? ["-i", name, "-vf", `select='${sel}',setpts=N/FRAME_RATE/TB`, "-af", `aselect='${sel}',asetpts=N/SR/TB`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out]
    : ["-i", name, "-af", `aselect='${sel}',asetpts=N/SR/TB`, "-c:a", "libmp3lame", "-b:a", "192k", out];
  const blob = await ffRun({
    inputs: [{ name, data: file }],
    args,
    output: out,
    mime: video ? "video/mp4" : "audio/mpeg",
    expected: Math.max(1, opts.duration - removed),
    label: "Cutting the pauses",
    onProgress,
  });
  return {
    blob,
    name: `${base} (no silences).${video ? "mp4" : "mp3"}`,
    checks: [`${cuts.length} ${cuts.length === 1 ? "pause" : "pauses"} cut`, `${formatTime(removed)} shorter`, `${formatTime(Math.max(0, opts.duration - removed))} long`, formatBytes(blob.size)],
  };
}

/** Compact mono MP3 of a file's sound, for sending to a speech AI. */
export async function audioForUpload(file: File, duration: number, onProgress?: (p: number, label: string) => void): Promise<Blob> {
  const name = inName(file);
  return ffRun({
    inputs: [{ name, data: file }],
    args: ["-i", name, "-vn", "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", "-write_xing", "0", "upload.mp3"],
    output: "upload.mp3",
    mime: "audio/mpeg",
    expected: duration,
    label: "Preparing the sound",
    onProgress,
  });
}

/** H.264 MP4 no taller than maxHeight, for sending to a video AI. */
export async function videoForUpload(file: File, duration: number, maxHeight: number, onProgress?: (p: number, label: string) => void): Promise<Blob> {
  const name = inName(file);
  return ffRun({
    inputs: [{ name, data: file }],
    args: ["-i", name, "-vf", `scale=-2:'min(${maxHeight},ih)'`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "upload.mp4"],
    output: "upload.mp4",
    mime: "video/mp4",
    expected: duration,
    label: "Preparing the video",
    onProgress,
  });
}
