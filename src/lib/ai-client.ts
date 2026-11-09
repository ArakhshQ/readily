// Talks to Readily's AI server (Supabase Edge Function "ai"). The server checks the
// plan, takes credits, runs the AI provider, and refunds credits if anything fails.
import { getSupabase } from "./supabase";

export interface AiFile {
  url: string;
  name: string;
  type: string;
}
export interface AiResult {
  job: string;
  status: "running" | "succeeded" | "failed";
  credits_left?: number;
  credits_used?: number;
  files?: AiFile[];
  text?: string;
  data?: unknown;
  error?: string;
}

const FN_URL = () => `${(process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "")}/functions/v1/ai`;

async function token(): Promise<string> {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error("Log in to use AI tools.");
  return t;
}

async function call<T>(body: object): Promise<T> {
  const res = await fetch(FN_URL(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await token()}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    },
    body: JSON.stringify(body),
  }).catch(() => {
    throw new Error("Couldn't reach Readily's AI server. Check your connection and try again.");
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(json.error || `The AI server said no (${res.status}). Try again in a moment.`);
  return json;
}

/** Uploads a prepared input to the user's private AI folder. Returns its storage path. */
export async function uploadInput(blob: Blob, ext: string): Promise<string> {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error("Log in to use AI tools.");
  const path = `${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("ai-inputs").upload(path, blob, { contentType: blob.type || "application/octet-stream", upsert: false });
  if (error) throw new Error(/exceeded|too large|size/i.test(error.message) ? "This file is too big to send. Trim or compress it first." : error.message);
  return path;
}

/** Starts a job and waits for it to finish, reporting progress while it runs. */
export async function runAi(
  tool: string,
  payload: Record<string, unknown>,
  onWait?: (seconds: number) => void,
): Promise<AiResult> {
  let res = await call<AiResult>({ action: "run", tool, ...payload });
  const started = Date.now();
  while (res.status === "running") {
    await new Promise((r) => setTimeout(r, 3000));
    onWait?.(Math.round((Date.now() - started) / 1000));
    res = await call<AiResult>({ action: "status", job: res.job });
    if (Date.now() - started > 30 * 60_000) throw new Error("This is taking much longer than usual. Check your dashboard later; credits are refunded if it fails.");
  }
  if (res.status === "failed") throw new Error(res.error || "The AI couldn't finish this file. Your credits were refunded.");
  return res;
}

/** Downloads a result file the server prepared. */
export async function fetchResult(f: AiFile): Promise<Blob> {
  const r = await fetch(f.url);
  if (!r.ok) throw new Error("The result couldn't be downloaded. Try again.");
  const b = await r.blob();
  return b.type ? b : new Blob([b], { type: f.type });
}

/** The list of AI voices for voiceover and the voice changer. */
export async function listVoices(): Promise<{ id: string; name: string; description: string; preview?: string }[]> {
  const r = await call<{ voices: { id: string; name: string; description: string; preview?: string }[] }>({ action: "voices" });
  return r.voices;
}

/** Plain-words commands: the server returns a list of steps; the device runs them. */
export async function planCommand(text: string, files: { name: string; type: string; size: number }[]) {
  return call<{ steps: unknown[]; reply: string; commands_left?: number }>({ action: "run", tool: "assistant", text, files });
}

/** The current state of one job (with a fresh download link if it finished). */
export function jobResult(job: string): Promise<AiResult> {
  return call<AiResult>({ action: "status", job });
}
