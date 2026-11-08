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
