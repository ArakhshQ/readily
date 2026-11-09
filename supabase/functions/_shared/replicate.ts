// Replicate: GPU models for studio voice, photo upscaling, restoration, colorizing,
// photo editing, photo to video, video background removal and video upscaling.
import { HttpError, env } from "./http.ts";

const API = "https://api.replicate.com/v1";
const auth = () => ({ Authorization: `Bearer ${env("REPLICATE_API_TOKEN")}`, "Content-Type": "application/json" });

interface ModelSpec {
  model: string;
  input: (url: string, opt: Record<string, unknown>) => Record<string, unknown>;
}

/** Model and inputs per tool. Any model can be swapped with REPLICATE_MODEL_<TOOL> (e.g. REPLICATE_MODEL_RESTORE_PHOTO). */
export const MODELS: Record<string, ModelSpec> = {
  "studio-voice": {
    model: "resemble-ai/resemble-enhance",
    input: (url) => ({ input_audio: url, solver: "Midpoint", number_function_evaluations: 64, prior_temperature: 0.5, denoise_flag: true }),
  },
  "hd-photo-upscaler": {
    model: "nightmareai/real-esrgan",
    input: (url, o) => ({ image: url, scale: 4, face_enhance: !!o.faces }),
  },
  "restore-photo": {
    model: "tencentarc/gfpgan",
    input: (url) => ({ img: url, version: "v1.4", scale: 2 }),
  },
  "colorize-photo": {
    model: "piddnad/ddcolor",
    input: (url) => ({ image: url, model_size: "large" }),
  },
  "ai-photo-editor": {
    model: "google/nano-banana",
    input: (url, o) => ({ prompt: String(o.prompt ?? ""), image_input: [url], output_format: "png" }),
  },
  "product-photo-backgrounds": {
    model: "google/nano-banana",
    input: (url, o) => ({
      prompt: `Professional product photo. Keep the product exactly as it is: same shape, colours, labels and text. Replace only the background and lighting with: ${String(
        o.prompt ?? "a clean white studio background with a soft shadow",
      )}. Photorealistic, high detail.`,
      image_input: [url],
      output_format: "png",
    }),
  },
  "photo-to-video": {
    model: "wan-video/wan-2.2-i2v-fast",
    input: (url, o) => ({ image: url, prompt: String(o.prompt || "natural, gentle motion, cinematic"), num_frames: 81, frames_per_second: 16, resolution: "480p", go_fast: true }),
  },
  "video-background-remover": {
    model: "arielreplicate/robust_video_matting",
    input: (url) => ({ input_video: url, output_type: "green-screen" }),
  },
  "video-upscaler": {
    model: "topazlabs/video-upscale",
    input: (url, o) => ({ video: url, target_resolution: o.target === "4k" ? "4k" : "1080p", target_fps: 30 }),
  },
};

const versions = new Map<string, string>();

/** "owner/name:version" for community models, "owner/name" for official ones. */
async function versionFor(model: string): Promise<string> {
  if (model.includes(":")) return model;
  const cached = versions.get(model);
  if (cached) return cached;
  const res = await fetch(`${API}/models/${model}`, { headers: auth() });
  if (!res.ok) throw new HttpError(502, `The AI model ${model} isn't available (${res.status}).`);
  const m = await res.json();
  const v = m.latest_version?.id ? `${model}:${m.latest_version.id}` : model;
  versions.set(model, v);
  return v;
}

export function modelFor(tool: string): ModelSpec {
  const spec = MODELS[tool];
  if (!spec) throw new HttpError(400, "Unknown AI tool.");
  const override = Deno.env.get(`REPLICATE_MODEL_${tool.toUpperCase().replace(/-/g, "_")}`);
  return override ? { ...spec, model: override } : spec;
}

export async function startPrediction(tool: string, inputUrl: string, opt: Record<string, unknown>): Promise<string> {
  const spec = modelFor(tool);
  const res = await fetch(`${API}/predictions`, {
    method: "POST",
    headers: auth(),
    body: JSON.stringify({ version: await versionFor(spec.model), input: spec.input(inputUrl, opt) }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new HttpError(503, "The AI is busy right now. Try again in a minute.");
    throw new HttpError(502, `The AI couldn't start (${res.status}). ${t.slice(0, 240)}`);
  }
  const p = await res.json();
  return p.id as string;
}

export async function prediction(id: string): Promise<{ status: string; output: unknown; error?: string }> {
  const res = await fetch(`${API}/predictions/${encodeURIComponent(id)}`, { headers: auth() });
  if (!res.ok) throw new HttpError(502, `Couldn't check the AI job (${res.status}).`);
  const p = await res.json();
  return { status: p.status, output: p.output, error: p.error ?? undefined };
}

/** The result URL from a model's output, whatever shape the model returns. */
export function outputUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const urls = output.filter((x) => typeof x === "string") as string[];
    return urls[urls.length - 1] ?? null;
  }
  if (output && typeof output === "object") {
    for (const v of Object.values(output as Record<string, unknown>)) {
      const u = outputUrl(v);
      if (u) return u;
    }
  }
  return null;
}
