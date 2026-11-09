// Readily plans. The 20 everyday tools are free without an account. Paid plans add
// higher-quality tools and AI, paid for with monthly credits. Checkout opens when
// payments are connected; until then paid plans collect a waitlist.
//
// Costs and margins behind these numbers are kept in a private spreadsheet, not in this repo.
// Keep storage in sync with plan_storage_bytes() in supabase/schema.sql.

export type PlanId = "free" | "basic" | "pro" | "premium";
export type PaidPlanId = Exclude<PlanId, "free">;
export type Level = 1 | 2 | 3;

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  yearly: string | null;
  period: string;
  tagline: string;
  /** AI credits per month (free accounts: one-time trial credits). */
  credits: number;
  /** Plain-words commands per month (0 = not included). */
  commands: number;
  highlights: string[];
  /** Cloud storage for saved files, in bytes. */
  storageBytes: number;
  /** How long history is kept, in days (0 = forever). */
  historyDays: number;
  /** True while checkout isn't connected: the button joins the waitlist. */
  waitlist: boolean;
  /** Tool level this plan unlocks (0 = everyday tools only). */
  level: 0 | Level;
  highlight?: boolean;
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const TRIAL_CREDITS = 20;

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    yearly: null,
    period: "forever",
    tagline: "All everyday tools, no account needed.",
    credits: TRIAL_CREDITS,
    commands: 0,
    level: 0,
    storageBytes: 100 * MB,
    historyDays: 30,
    waitlist: false,
    highlights: [
      "All 20 everyday PDF, image, video and audio tools",
      "Unlimited, no watermarks, files stay on your device",
      "Free account: 30 days of history and 100 MB of saved files",
      "Free account: try every Basic and Pro tool once, plus 20 AI credits",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price: "$4.99",
    yearly: "$49",
    period: "per month",
    tagline: "Better results on everyday files.",
    credits: 200,
    commands: 0,
    level: 1,
    storageBytes: 2 * GB,
    historyDays: 0,
    waitlist: true,
    highlights: [
      "Everything in Free",
      "Voice noise remover, background remover, photo upscaler, object eraser",
      "PDF to Word, PDF summaries and questions, transcription",
      "Searchable scans in 100+ languages, protect and unlock PDFs",
      "Batch mode: 100 files at once, saved presets",
      "200 AI credits a month",
      "2 GB of saved files, full history",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$11.99",
    yearly: "$119",
    period: "per month",
    tagline: "For creators, students and small businesses.",
    credits: 700,
    commands: 300,
    level: 2,
    storageBytes: 10 * GB,
    historyDays: 0,
    waitlist: true,
    highlight: true,
    highlights: [
      "Everything in Basic",
      "Studio voice enhancer and auto subtitles",
      "Translate whole documents",
      "Restore and colorize old photos, HD photo upscaling",
      "Plain-words commands: describe the result, Readily does the steps",
      "700 AI credits a month",
      "10 GB of saved files",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$29.99",
    yearly: "$299",
    period: "per month",
    tagline: "The best AI voice, video and image results.",
    credits: 2000,
    commands: 1000,
    level: 3,
    storageBytes: 25 * GB,
    historyDays: 0,
    waitlist: true,
    highlights: [
      "Everything in Pro",
      "Best-quality studio voice, AI voiceover and voice changer",
      "AI dubbing: your video in another language",
      "Video background remover and HD / 4K video upscaler",
      "Photo to video, AI photo editor, product backgrounds",
      "Best-quality translation",
      "2,000 AI credits a month",
      "25 GB of saved files",
    ],
  },
];

export const PLAN_BY_ID: Record<PlanId, Plan> = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<PlanId, Plan>;
export const PAID_PLANS = PLANS.filter((p) => p.id !== "free") as (Plan & { id: PaidPlanId })[];

/** Old plan names from before the four-plan lineup. */
export function toPlanId(v: unknown): PlanId {
  if (v === "ai-plus") return "pro";
  return typeof v === "string" && v in PLAN_BY_ID ? (v as PlanId) : "free";
}
export function toPaidPlanId(v: unknown): PaidPlanId | null {
  const id = toPlanId(v);
  return id === "free" ? null : id;
}

// ------------------------------------------------------------ paid tools

export type ToolGroup = "Audio" | "Image" | "PDF" | "Video" | "All";

export interface PaidTool {
  name: string;
  level: Level;
  group: ToolGroup;
  what: string;
  /** Credits per unit; 0 = runs on your device, unlimited. */
  credits: number;
  unit: string;
  /** Capped instead of charged credits (plain-words commands). */
  capped?: boolean;
}

export const PAID_TOOLS: PaidTool[] = [
  // Basic
  { name: "Voice noise remover", level: 1, group: "Audio", what: "Removes traffic, fans, wind and room noise behind a voice, in audio and video.", credits: 0, unit: "file" },
  { name: "Image background remover", level: 1, group: "Image", what: "Cuts out a person or product, leaving a clean background.", credits: 0, unit: "image" },
  { name: "Photo upscaler 2x / 4x", level: 1, group: "Image", what: "Makes small or blurry photos bigger and sharper.", credits: 0, unit: "image" },
  { name: "Object eraser", level: 1, group: "Image", what: "Brush over a person, sign or text and it disappears.", credits: 0, unit: "image" },
  { name: "Searchable scans, 100+ languages", level: 1, group: "PDF", what: "Makes scanned PDFs searchable in any language, including Persian and Arabic.", credits: 0, unit: "file" },
  { name: "Protect and unlock PDF", level: 1, group: "PDF", what: "Add a password to a PDF, or remove one you know.", credits: 0, unit: "file" },
  { name: "Remove silences", level: 1, group: "Audio", what: "Cuts long pauses out of recordings and videos.", credits: 0, unit: "file" },
  { name: "Batch mode and presets", level: 1, group: "All", what: "Run any tool on up to 100 files at once and reuse your settings.", credits: 0, unit: "batch" },
  { name: "PDF to Word", level: 1, group: "PDF", what: "Turns a PDF into an editable Word file, keeping the layout.", credits: 5, unit: "file" },
  { name: "Summarize documents", level: 1, group: "PDF", what: "A short, clear summary of a long PDF.", credits: 1, unit: "document" },
  { name: "Ask questions about a PDF", level: 1, group: "PDF", what: "Ask anything about a document; the answer points to the page.", credits: 1, unit: "question" },
  { name: "Transcribe audio and video", level: 1, group: "Audio", what: "Speech to text in many languages, with timestamps.", credits: 1, unit: "minute" },
  // Pro
  { name: "Studio voice enhancer", level: 2, group: "Audio", what: "Makes phone recordings sound like a studio mic: clearer, less echo.", credits: 5, unit: "minute" },
  { name: "Auto subtitles", level: 2, group: "Video", what: "Adds subtitles to a video, as a file or burned in.", credits: 1, unit: "minute" },
  { name: "Translate documents", level: 2, group: "PDF", what: "Translates whole documents.", credits: 1, unit: "page" },
  { name: "AI photo upscaler HD", level: 2, group: "Image", what: "Bigger, sharper upscaling for prints and large photos.", credits: 1, unit: "image" },
  { name: "Restore old photos", level: 2, group: "Image", what: "Fixes faces and detail in old, blurry or damaged photos.", credits: 6, unit: "image" },
  { name: "Colorize photos", level: 2, group: "Image", what: "Adds natural colour to black-and-white photos.", credits: 3, unit: "image" },
  { name: "Plain-words commands", level: 2, group: "All", what: "Type 'these scans as one PDF under 2 MB' and Readily runs the steps.", credits: 0, unit: "command", capped: true },
  // Premium
  { name: "Studio voice, best quality", level: 3, group: "Audio", what: "The cleanest voice isolation: removes music, crowds and heavy noise.", credits: 30, unit: "minute" },
  { name: "AI voiceover", level: 3, group: "Audio", what: "Turns text into natural speech in many voices and languages.", credits: 20, unit: "1,000 characters" },
  { name: "Voice changer", level: 3, group: "Audio", what: "Re-voices a recording in a different voice, keeping the delivery.", credits: 30, unit: "minute" },
  { name: "AI dubbing", level: 3, group: "Video", what: "Translates the speech in a video into another language, in a similar voice.", credits: 125, unit: "minute" },
  { name: "Translate documents, best quality", level: 3, group: "PDF", what: "Higher-quality translation for important documents.", credits: 3, unit: "page" },
  { name: "Video background remover", level: 3, group: "Video", what: "Removes or replaces the background behind a person, no green screen.", credits: 25, unit: "minute" },
  { name: "Video upscaler HD / 4K", level: 3, group: "Video", what: "Makes low-resolution video sharp at HD or 4K.", credits: 250, unit: "minute" },
  { name: "Photo to video", level: 3, group: "Video", what: "Brings a photo to life as a 5-second moving clip.", credits: 32, unit: "clip" },
  { name: "AI photo editor", level: 3, group: "Image", what: "Describe the change ('remove the sign', 'make it sunset') and it's done.", credits: 9, unit: "image" },
  { name: "AI product backgrounds", level: 3, group: "Image", what: "Puts product photos on a new, realistic background.", credits: 9, unit: "image" },
];

function amount(n: number, unit: string): string {
  if (unit === "1,000 characters") return `${n.toLocaleString("en-US")}k characters`;
  return `${n.toLocaleString("en-US")} ${n === 1 ? unit : `${unit}s`}`;
}

/** What one plan gets of one tool: "Unlimited", a monthly amount, a trial, or "—". */
export function allowance(tool: PaidTool, plan: Plan): string {
  if (plan.id === "free") {
    if (tool.level > 2) return "—";
    if (tool.capped) return "3 tries";
    if (tool.credits === 0) return "1 free try";
    return `${amount(Math.floor(plan.credits / tool.credits), tool.unit)}, once`;
  }
  if (tool.level > plan.level) return "—";
  if (tool.capped) return `${amount(plan.commands, tool.unit)}\u00a0/mo`;
  if (tool.credits === 0) return "Unlimited";
  return `${amount(Math.floor(plan.credits / tool.credits), tool.unit)}\u00a0/mo`;
}

/** The short list of reasons to sign up, used by the reminder and signup page. */
export const SIGNUP_REASONS = [
  "Keep a history of everything you make",
  "Save files and open them on any device",
  "Try the new Basic and Pro tools free as they launch",
];
