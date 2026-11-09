// ElevenLabs: transcription, best-quality voice isolation, voiceover, voice changer, dubbing.
import { HttpError, env } from "./http.ts";

const API = "https://api.elevenlabs.io/v1";
const key = () => env("ELEVENLABS_API_KEY");

async function fail(res: Response, what: string): Promise<never> {
  const t = await res.text().catch(() => "");
  if (res.status === 429) throw new HttpError(503, "The voice AI is busy right now. Try again in a minute.");
  throw new HttpError(502, `${what} failed (${res.status}). ${t.slice(0, 240)}`);
}

function form(fields: Record<string, string | Blob>, fileName = "audio.mp3") {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v instanceof Blob) f.append(k, v, fileName);
    else f.append(k, v);
  }
  return f;
}

export interface Word {
  text: string;
  start: number;
  end: number;
  type: string;
  speaker_id?: string;
}

export async function transcribe(audio: Blob): Promise<{ language: string; text: string; words: Word[] }> {
  const res = await fetch(`${API}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": key() },
    body: form({
      model_id: Deno.env.get("ELEVENLABS_STT_MODEL") ?? "scribe_v1",
      file: audio,
      timestamps_granularity: "word",
      diarize: "true",
      tag_audio_events: "false",
    }),
  });
  if (!res.ok) await fail(res, "Transcription");
  const d = await res.json();
  return { language: d.language_code ?? "", text: d.text ?? "", words: (d.words ?? []).filter((w: Word) => w.type !== "audio_event") };
}

export async function isolateVoice(audio: Blob): Promise<Blob> {
  const res = await fetch(`${API}/audio-isolation`, { method: "POST", headers: { "xi-api-key": key() }, body: form({ audio }) });
  if (!res.ok) await fail(res, "Voice isolation");
  return new Blob([await res.arrayBuffer()], { type: "audio/mpeg" });
}

export async function changeVoice(audio: Blob, voiceId: string): Promise<Blob> {
  const res = await fetch(`${API}/speech-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key() },
    body: form({ audio, model_id: Deno.env.get("ELEVENLABS_STS_MODEL") ?? "eleven_multilingual_sts_v2", remove_background_noise: "true" }),
  });
  if (!res.ok) await fail(res, "Voice changing");
  return new Blob([await res.arrayBuffer()], { type: "audio/mpeg" });
}

export async function speak(text: string, voiceId: string): Promise<Blob> {
  const res = await fetch(`${API}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key(), "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: Deno.env.get("ELEVENLABS_TTS_MODEL") ?? "eleven_multilingual_v2" }),
  });
  if (!res.ok) await fail(res, "Voiceover");
  return new Blob([await res.arrayBuffer()], { type: "audio/mpeg" });
}

export async function voices(): Promise<{ id: string; name: string; description: string; preview?: string }[]> {
  const res = await fetch(`${API}/voices`, { headers: { "xi-api-key": key() } });
  if (!res.ok) await fail(res, "Loading voices");
  const d = await res.json();
  return (d.voices ?? [])
    .filter((v: { category?: string }) => v.category !== "cloned")
    .map((v: { voice_id: string; name: string; labels?: Record<string, string>; preview_url?: string }) => ({
      id: v.voice_id,
      name: v.name,
      description: [v.labels?.gender, v.labels?.age, v.labels?.accent, v.labels?.description ?? v.labels?.descriptive].filter(Boolean).join(", "),
      preview: v.preview_url,
    }))
    .slice(0, 60);
}

export async function startDub(audio: Blob, target: string): Promise<string> {
  const res = await fetch(`${API}/dubbing`, {
    method: "POST",
    headers: { "xi-api-key": key() },
    body: form({ file: audio, target_lang: target, source_lang: "auto", num_speakers: "0", watermark: "false", name: "Readily dub" }),
  });
  if (!res.ok) await fail(res, "Dubbing");
  const d = await res.json();
  if (!d.dubbing_id) throw new HttpError(502, "Dubbing didn't start. Try again.");
  return d.dubbing_id as string;
}

export async function dubStatus(id: string): Promise<{ status: string; error?: string }> {
  const res = await fetch(`${API}/dubbing/${encodeURIComponent(id)}`, { headers: { "xi-api-key": key() } });
  if (!res.ok) await fail(res, "Checking the dub");
  const d = await res.json();
  return { status: d.status, error: d.error };
}

export async function dubAudio(id: string, lang: string): Promise<Response> {
  const res = await fetch(`${API}/dubbing/${encodeURIComponent(id)}/audio/${encodeURIComponent(lang)}`, { headers: { "xi-api-key": key() } });
  if (!res.ok) await fail(res, "Downloading the dub");
  return res;
}
