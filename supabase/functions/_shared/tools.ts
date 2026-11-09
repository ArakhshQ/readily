// What each AI tool costs and who may use it. Keep in sync with src/lib/tools-pro.ts
// (scripts/check-server-tools.mjs compares the two before every build).
export type Plan = "free" | "basic" | "pro" | "premium";
export const PLAN_LEVEL: Record<Plan, number> = { free: 0, basic: 1, pro: 2, premium: 3 };
/** Plain-words commands per month; accounts below Pro get 3 tries in total. */
export const COMMANDS: Record<Plan, number> = { free: 0, basic: 0, pro: 300, premium: 1000 };
export const COMMAND_TRIES = 3;

export type Kind = "text" | "audio" | "video" | "image" | "tts" | "plan";

export interface ServerTool {
  level: number;
  kind: Kind;
  /** Credits per unit. */
  credits: number;
  /** Premium-only higher quality mode. */
  best?: { credits: number };
  /** Longest input accepted, in minutes, for audio and video. */
  maxMinutes?: number;
}

export const SERVER_TOOLS: Record<string, ServerTool> = {
  "summarize-pdf": { level: 1, kind: "text", credits: 1 },
  "chat-with-pdf": { level: 1, kind: "text", credits: 1 },
  transcribe: { level: 1, kind: "audio", credits: 1, maxMinutes: 60 },
  "studio-voice": { level: 2, kind: "audio", credits: 5, best: { credits: 30 }, maxMinutes: 10 },
  "auto-subtitles": { level: 2, kind: "audio", credits: 1, maxMinutes: 60 },
  "translate-document": { level: 2, kind: "text", credits: 1, best: { credits: 3 } },
  "hd-photo-upscaler": { level: 2, kind: "image", credits: 2 },
  "restore-photo": { level: 2, kind: "image", credits: 6 },
  "colorize-photo": { level: 2, kind: "image", credits: 2 },
  assistant: { level: 2, kind: "plan", credits: 0 },
  "ai-voiceover": { level: 3, kind: "tts", credits: 20 },
  "voice-changer": { level: 3, kind: "audio", credits: 30, maxMinutes: 10 },
  "ai-dubbing": { level: 3, kind: "audio", credits: 125, maxMinutes: 10 },
  "video-background-remover": { level: 3, kind: "video", credits: 25, maxMinutes: 5 },
  "video-upscaler": { level: 3, kind: "video", credits: 250, maxMinutes: 3 },
  "photo-to-video": { level: 3, kind: "image", credits: 40 },
  "ai-photo-editor": { level: 3, kind: "image", credits: 10 },
  "product-photo-backgrounds": { level: 3, kind: "image", credits: 10 },
};

/** Characters per credit for summaries and questions (about 40 pages). */
export const TEXT_CHARS_PER_CREDIT = 100_000;
/** Characters per translated page. */
export const PAGE_CHARS = 3_000;
/** Longest text accepted in one request. */
export const MAX_TEXT_CHARS = 300_000;
export const MAX_TTS_CHARS = 10_000;

/** Credits for one request. `units` is minutes, pages, characters or images depending on the tool. */
export function creditsFor(slug: string, best: boolean, measure: { minutes?: number; chars?: number }): number {
  const t = SERVER_TOOLS[slug];
  const per = best && t.best ? t.best.credits : t.credits;
  switch (slug) {
    case "summarize-pdf":
    case "chat-with-pdf":
      return Math.max(1, Math.ceil((measure.chars ?? 0) / TEXT_CHARS_PER_CREDIT)) * per;
    case "translate-document":
      return Math.max(1, Math.ceil((measure.chars ?? 0) / PAGE_CHARS)) * per;
    case "ai-voiceover":
      return Math.max(1, Math.ceil((measure.chars ?? 0) / 1000)) * per;
    case "assistant":
      return 0;
    default:
      if (t.kind === "audio" || t.kind === "video") return Math.max(1, Math.ceil(measure.minutes ?? 0)) * per;
      return per;
  }
}
