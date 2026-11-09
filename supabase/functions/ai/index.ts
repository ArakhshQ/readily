// Readily AI server. Every AI tool request comes here: it checks who's asking and
// their plan, measures the file, takes credits, runs the AI provider, stores the
// result privately for 24 hours, and refunds credits if anything goes wrong.
//
// Deploy: supabase functions deploy ai
import { HttpError, cors, json } from "../_shared/http.ts";
import * as db from "../_shared/db.ts";
import { imageSize, mp3Duration, mp4Duration } from "../_shared/media.ts";
import {
  COMMANDS,
  COMMAND_TRIES,
  MAX_TEXT_CHARS,
  MAX_TTS_CHARS,
  PLAN_LEVEL,
  SERVER_TOOLS,
  creditsFor,
  type Plan,
} from "../_shared/tools.ts";
import * as claudeApi from "../_shared/anthropic.ts";
import * as eleven from "../_shared/elevenlabs.ts";
import * as replicate from "../_shared/replicate.ts";

type User = { id: string; email?: string };
type Body = Record<string, unknown> & { action?: string; tool?: string; job?: string };
interface Job {
  id: string;
  user_id: string;
  tool: string;
  option: string | null;
  status: "running" | "succeeded" | "failed";
  credits: number;
  provider: string | null;
  provider_ref: string | null;
  input_path: string | null;
  output_path: string | null;
  output: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
}
type Done = { text?: string; data?: unknown; file?: { body: BodyInit; name: string; type: string } };
type Started = { provider: string; ref: string; outName: string; outType: string };

const MAX_RUNNING = 3;
const OUTPUT_HOURS = 24;

// ------------------------------------------------------------------ helpers

function str(v: unknown, max: number, what: string): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new HttpError(400, `Missing ${what}.`);
  if (s.length > max) throw new HttpError(413, `The ${what} is too long (${s.length.toLocaleString()} characters, the limit is ${max.toLocaleString()}).`);
  return s;
}

function ownPath(user: User, v: unknown): string {
  const p = typeof v === "string" ? v : "";
  if (!p.startsWith(`${user.id}/`) || p.includes("..")) throw new HttpError(400, "That upload doesn't belong to you.");
  return p;
}

async function saveFile(user: User, job: string, file: { body: BodyInit; name: string; type: string }) {
  const safe = file.name.replace(/[^\w.\- ()]+/g, "_").slice(-120);
  const path = `${user.id}/${job}/${safe}`;
  await db.upload("ai-outputs", path, file.body, file.type);
  return path;
}

async function resultFor(job: Job, creditsLeft?: number) {
  const out: Record<string, unknown> = { job: job.id, status: job.status, credits_used: job.credits };
  if (creditsLeft !== undefined) out.credits_left = creditsLeft;
  if (job.status === "failed") out.error = job.error ?? "The AI couldn't finish this file. Your credits were refunded.";
  if (job.status === "succeeded") {
    if (job.output?.text) out.text = job.output.text;
    if (job.output?.data) out.data = job.output.data;
    if (job.output_path) {
      const name = job.output_path.split("/").pop()!;
      out.files = [{ url: await db.signedUrl("ai-outputs", job.output_path, OUTPUT_HOURS * 3600, name), name, type: String(job.output?.type ?? "application/octet-stream") }];
    }
  }
  return out;
}

async function cleanupOld(user: User) {
  // Results are kept for 24 hours; tidy this user's older ones.
  const cutoff = Date.now() - OUTPUT_HOURS * 3600_000;
  const jobs = await db.select<{ id: string; output_path: string | null }>(
    "ai_jobs",
    `select=id,output_path&user_id=eq.${user.id}&output_path=not.is.null&created_at=lt.${new Date(cutoff).toISOString()}&limit=50`,
  );
  if (!jobs.length) return;
  await db.removeObjects("ai-outputs", jobs.map((j) => j.output_path!));
  await db.update("ai_jobs", `id=in.(${jobs.map((j) => j.id).join(",")})`, { output_path: null });
}

async function fail(user: User, job: Job, message: string, trial: boolean) {
  await db.rpc("refund_credits", { p_user: user.id, p_amount: job.credits, p_reason: `refund ${job.tool}`, p_job: job.id }).catch(() => {});
  if (trial) await db.remove("tool_trials", `user_id=eq.${user.id}&tool=eq.${job.tool}`).catch(() => {});
  await db.update("ai_jobs", `id=eq.${job.id}`, { status: "failed", error: message.slice(0, 500), updated_at: new Date().toISOString() }).catch(() => {});
  if (job.input_path) await db.removeObjects("ai-inputs", [job.input_path]);
}

// ------------------------------------------------------------------ run

async function run(user: User, body: Body) {
  const slug = String(body.tool ?? "");
  const tool = SERVER_TOOLS[slug];
  if (!tool) throw new HttpError(400, "Unknown AI tool.");
  const best = body.quality === "best" && !!tool.best;
  const [profile] = await db.select<{ plan: Plan; credits: number }>("profiles", `select=plan,credits&id=eq.${user.id}`);
  if (!profile) throw new HttpError(403, "Your account isn't ready yet. Log out and in again.");
  const planLevel = PLAN_LEVEL[profile.plan] ?? 0;
  const needed = best ? 3 : tool.level;

  cleanupOld(user).catch(() => {});

  if (slug === "assistant") return runAssistant(user, profile.plan, body);

  const running = await db.select<{ id: string }>("ai_jobs", `select=id&user_id=eq.${user.id}&status=eq.running&created_at=gt.${new Date(Date.now() - 3600_000).toISOString()}`);
  if (running.length >= MAX_RUNNING) throw new HttpError(429, "You already have 3 AI jobs running. Wait for one to finish.");

  // Measure the request so the charge matches the real file.
  let inputPath: string | null = null;
  let bytes: Uint8Array | null = null;
  let minutes = 0;
  let chars = 0;
  if (tool.kind === "text") {
    chars = str(body.text, slug === "translate-document" ? 20_000 : MAX_TEXT_CHARS, "document text").length;
  } else if (tool.kind === "tts") {
    chars = str(body.text, MAX_TTS_CHARS, "script").length;
  } else {
    inputPath = ownPath(user, body.path);
    bytes = await db.download("ai-inputs", inputPath);
    if (tool.kind === "audio") {
      const sec = mp3Duration(bytes);
      if (!sec) throw new HttpError(400, "The sound couldn't be read. Try a different file.");
      minutes = sec / 60;
    } else if (tool.kind === "video") {
      const sec = mp4Duration(bytes);
      if (!sec) throw new HttpError(400, "The video couldn't be read. Try a different file.");
      minutes = sec / 60;
    } else if (tool.kind === "image") {
      const size = imageSize(bytes);
      if (!size) throw new HttpError(400, "That image couldn't be read. Use a JPG, PNG or WebP.");
      if (size.width * size.height > 26_000_000) throw new HttpError(413, "That image is too large. Use one under 25 megapixels.");
    }
    if (tool.maxMinutes && minutes > tool.maxMinutes + 0.05) {
      await db.removeObjects("ai-inputs", [inputPath]);
      throw new HttpError(413, `This tool takes up to ${tool.maxMinutes} minutes at a time. Trim the file and try again.`);
    }
  }
  const credits = creditsFor(slug, best, { minutes, chars });

  // Who may use it: their plan, or one free try of a Basic or Pro tool.
  let trial = false;
  if (planLevel < needed) {
    if (needed > 2) throw new HttpError(403, best ? "Best quality is part of Premium." : "This is a Premium tool. Upgrade to use it.");
    trial = await db.rpc<boolean>("claim_trial", { p_user: user.id, p_tool: slug });
    if (!trial) throw new HttpError(403, "You've used your free try of this tool. Upgrade to keep using it.");
  }

  const job = await db.insert<Job>("ai_jobs", {
    user_id: user.id,
    tool: slug,
    option: best ? "best" : null,
    credits,
    status: "running",
    input_path: inputPath,
  });

  let left: number;
  try {
    left = await db.rpc<number>("spend_credits", { p_user: user.id, p_amount: credits, p_reason: slug, p_job: job.id });
  } catch (e) {
    if (trial) await db.remove("tool_trials", `user_id=eq.${user.id}&tool=eq.${slug}`).catch(() => {});
    await db.update("ai_jobs", `id=eq.${job.id}`, { status: "failed", credits: 0, error: "not enough credits" }).catch(() => {});
    if (inputPath) await db.removeObjects("ai-inputs", [inputPath]);
    throw e;
  }

  try {
    const r = await dispatch(user, slug, best, body, inputPath, bytes);
    if ("provider" in r) {
      await db.update("ai_jobs", `id=eq.${job.id}`, { provider: r.provider, provider_ref: r.ref, output: { name: r.outName, type: r.outType, trial } });
      return { job: job.id, status: "running", credits_used: credits, credits_left: left };
    }
    const output: Record<string, unknown> = {};
    let outputPath: string | null = null;
    if (r.text) output.text = r.text;
    if (r.data) output.data = r.data;
    if (r.file) {
      outputPath = await saveFile(user, job.id, r.file);
      output.type = r.file.type;
    }
    await db.update("ai_jobs", `id=eq.${job.id}`, { status: "succeeded", output, output_path: outputPath, updated_at: new Date().toISOString() });
    if (inputPath) await db.removeObjects("ai-inputs", [inputPath]);
    return resultFor({ ...job, status: "succeeded", output, output_path: outputPath }, left);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await fail(user, job, msg, trial);
    throw e instanceof HttpError ? e : new HttpError(502, `The AI couldn't finish this file. Your credits were refunded. (${msg.slice(0, 160)})`);
  }
}

async function dispatch(user: User, slug: string, best: boolean, body: Body, inputPath: string | null, bytes: Uint8Array | null): Promise<Done | Started> {
  const signed = inputPath ? () => db.signedUrl("ai-inputs", inputPath, 3 * 3600) : null;
  const audio = bytes ? new Blob([bytes as BlobPart], { type: "audio/mpeg" }) : null;
  switch (slug) {
    case "summarize-pdf": {
      const p = claudeApi.summarizePrompt(String(body.text), body.length === "detailed" ? "detailed" : "short", typeof body.language === "string" ? body.language.slice(0, 40) : undefined);
      return { text: await claudeApi.claude({ model: claudeApi.MODEL_FAST(), ...p }) };
    }
    case "chat-with-pdf": {
      const q = str(body.question, 1000, "question");
      return { text: await claudeApi.claude({ model: claudeApi.MODEL_FAST(), ...claudeApi.questionPrompt(String(body.text), q) }) };
    }
    case "translate-document": {
      const target = str(body.target, 40, "language");
      if (!/^[\p{L} ()\-]+$/u.test(target)) throw new HttpError(400, "Pick a language from the list.");
      const p = claudeApi.translatePrompt(String(body.text), target);
      return { text: await claudeApi.claude({ model: best ? claudeApi.MODEL_BEST() : claudeApi.MODEL_FAST(), ...p, temperature: 0.1 }) };
    }
    case "transcribe":
    case "auto-subtitles": {
      const r = await eleven.transcribe(audio!);
      return { text: r.text, data: { language: r.language, words: r.words } };
    }
    case "studio-voice": {
      if (best) return { file: { body: await eleven.isolateVoice(audio!), name: "studio-voice.mp3", type: "audio/mpeg" } };
      return { provider: "replicate", ref: await replicate.startPrediction(slug, await signed!(), {}), outName: "studio-voice.wav", outType: "audio/wav" };
    }
    case "voice-changer": {
      const voice = str(body.voice, 64, "voice");
      return { file: { body: await eleven.changeVoice(audio!, voice), name: "new-voice.mp3", type: "audio/mpeg" } };
    }
    case "ai-voiceover": {
      const voice = str(body.voice, 64, "voice");
      return { file: { body: await eleven.speak(String(body.text).trim(), voice), name: "voiceover.mp3", type: "audio/mpeg" } };
    }
    case "ai-dubbing": {
      const lang = str(body.target, 10, "language");
      if (!/^[a-z]{2,3}(-[a-zA-Z]{2,4})?$/.test(lang)) throw new HttpError(400, "Pick a language from the list.");
      return { provider: `elevenlabs-dub:${lang}`, ref: await eleven.startDub(audio!, lang), outName: `dubbed-${lang}.mp3`, outType: "audio/mpeg" };
    }
    case "ai-photo-editor":
    case "product-photo-backgrounds":
    case "photo-to-video": {
      const prompt = slug === "photo-to-video" ? String(body.prompt ?? "").slice(0, 400) : str(body.prompt, 500, "description");
      const outName = slug === "photo-to-video" ? "photo-video.mp4" : `${slug === "ai-photo-editor" ? "edited" : "product"}.png`;
      return { provider: "replicate", ref: await replicate.startPrediction(slug, await signed!(), { prompt }), outName, outType: slug === "photo-to-video" ? "video/mp4" : "image/png" };
    }
    case "hd-photo-upscaler":
    case "restore-photo":
    case "colorize-photo":
      return { provider: "replicate", ref: await replicate.startPrediction(slug, await signed!(), { faces: body.faces === true }), outName: `${slug}.png`, outType: "image/png" };
    case "video-background-remover":
    case "video-upscaler":
      return {
        provider: "replicate",
        ref: await replicate.startPrediction(slug, await signed!(), { target: body.target }),
        outName: slug === "video-upscaler" ? "upscaled.mp4" : "no-background.mp4",
        outType: "video/mp4",
      };
  }
  void user;
  throw new HttpError(400, "Unknown AI tool.");
}

async function runAssistant(user: User, plan: Plan, body: Body) {
  const text = str(body.text, 1000, "request");
  const files = Array.isArray(body.files) ? (body.files as { name: string; type: string; size: number }[]) : [];
  const pro = PLAN_LEVEL[plan] >= 2;
  const since = pro ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() : "1970-01-01T00:00:00Z";
  const used = await db.select<{ id: string }>("ai_jobs", `select=id&user_id=eq.${user.id}&tool=eq.assistant&status=eq.succeeded&created_at=gte.${since}`);
  const limit = pro ? COMMANDS[plan] : COMMAND_TRIES;
  if (used.length >= limit) {
    throw new HttpError(403, pro ? "You've used this month's commands. They refresh next month." : "You've used your 3 free tries. Upgrade to Pro to keep using commands.");
  }
  const p = claudeApi.assistantPrompt(text, files);
  const raw = await claudeApi.claude({ model: claudeApi.MODEL_FAST(), ...p, temperature: 0 });
  let parsed: { steps?: unknown[]; reply?: string };
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?|```$/g, "").trim());
  } catch {
    throw new HttpError(502, "The assistant's answer couldn't be understood. Try saying it a different way.");
  }
  await db.insert("ai_jobs", { user_id: user.id, tool: "assistant", credits: 0, status: "succeeded", output: { text } });
  return { steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, 12) : [], reply: String(parsed.reply ?? ""), commands_left: Math.max(0, limit - used.length - 1) };
}

// ------------------------------------------------------------------ status

async function status(user: User, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(400, "Unknown job.");
  const [job] = await db.select<Job>("ai_jobs", `select=*&id=eq.${id}&user_id=eq.${user.id}`);
  if (!job) throw new HttpError(404, "That job wasn't found.");
  if (job.status !== "running") return resultFor(job);
  const trial = !!job.output?.trial;
  const age = Date.now() - new Date(job.created_at).getTime();
  if (age > 45 * 60_000) {
    await fail(user, job, "This took too long and was stopped. Your credits were refunded.", trial);
    return resultFor({ ...job, status: "failed", error: "This took too long and was stopped. Your credits were refunded." });
  }
  const name = String(job.output?.name ?? "result");
  const type = String(job.output?.type ?? "application/octet-stream");
  try {
    if (job.provider === "replicate") {
      const p = await replicate.prediction(job.provider_ref!);
      if (p.status === "failed" || p.status === "canceled") throw new Error(p.error || "the AI job failed");
      if (p.status !== "succeeded") return { job: job.id, status: "running" };
      const url = replicate.outputUrl(p.output);
      if (!url) throw new Error("the AI returned no file");
      const res = await fetch(url);
      if (!res.ok || !res.body) throw new Error("the result couldn't be fetched");
      const ext = (url.split("?")[0].split(".").pop() || "").toLowerCase();
      const realName = /^(png|jpg|jpeg|webp|mp4|wav|mp3)$/.test(ext) ? name.replace(/\.[a-z0-9]+$/, `.${ext}`) : name;
      const realType = res.headers.get("content-type") || type;
      const path = await saveFile(user, job.id, { body: res.body, name: realName, type: realType });
      const output = { ...(job.output ?? {}), type: realType };
      await db.update("ai_jobs", `id=eq.${job.id}`, { status: "succeeded", output_path: path, output, updated_at: new Date().toISOString() });
      if (job.input_path) await db.removeObjects("ai-inputs", [job.input_path]);
      return resultFor({ ...job, status: "succeeded", output_path: path, output });
    }
    if (job.provider?.startsWith("elevenlabs-dub:")) {
      const lang = job.provider.split(":")[1];
      const s = await eleven.dubStatus(job.provider_ref!);
      if (s.status === "failed") throw new Error(s.error || "dubbing failed");
      if (s.status !== "dubbed") return { job: job.id, status: "running" };
      const res = await eleven.dubAudio(job.provider_ref!, lang);
      const path = await saveFile(user, job.id, { body: res.body!, name, type });
      await db.update("ai_jobs", `id=eq.${job.id}`, { status: "succeeded", output_path: path, updated_at: new Date().toISOString() });
      if (job.input_path) await db.removeObjects("ai-inputs", [job.input_path]);
      return resultFor({ ...job, status: "succeeded", output_path: path });
    }
    return { job: job.id, status: "running" };
  } catch (e) {
    const msg = `The AI couldn't finish this file, so your credits were refunded. (${(e instanceof Error ? e.message : String(e)).slice(0, 160)})`;
    await fail(user, job, msg, trial);
    return resultFor({ ...job, status: "failed", error: msg });
  }
}

// ------------------------------------------------------------------ voices

let voiceCache: { at: number; list: Awaited<ReturnType<typeof eleven.voices>> } | null = null;
async function voices() {
  if (!voiceCache || Date.now() - voiceCache.at > 10 * 60_000) voiceCache = { at: Date.now(), list: await eleven.voices() };
  return { voices: voiceCache.list };
}

// ------------------------------------------------------------------ server

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    if (req.method !== "POST") throw new HttpError(405, "Use POST.");
    const user = await db.userFromRequest(req);
    const body = (await req.json().catch(() => ({}))) as Body;
    if (body.action === "voices") return json(req, await voices());
    if (body.action === "status") return json(req, await status(user, String(body.job ?? "")));
    if (body.action === "run") return json(req, await run(user, body));
    throw new HttpError(400, "Unknown action.");
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Something went wrong.";
    if (status >= 500) console.error(message);
    return json(req, { error: message }, status);
  }
});
