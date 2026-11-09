// Readily plans. The 20 everyday tools are free without an account. Paid plans add
// higher-quality tools and AI, paid for with monthly credits. Checkout opens when
// payments are connected; until then paid plans collect a waitlist.
//
// Costs and margins behind these numbers are kept in a private spreadsheet, not in this repo.
// Keep storage in sync with plan_storage_bytes() in supabase/schema.sql.

import { TOOLS, type ToolSlug } from "./tools";

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
      "PDF to Word, searchable scans in 100+ languages, protect and unlock PDFs",
      "Remove silences from recordings and videos",
      "AI summaries and questions for PDFs, transcription",
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

/** One row of the plan comparison: a paid tool, or a tool's Premium-only mode. */
export interface PaidTool {
  slug: ToolSlug;
  name: string;
  level: Level;
  what: string;
  /** Credits per unit; 0 = runs on your device, unlimited. */
  credits: number;
  unit: string;
  /** Capped instead of charged credits (plain-words commands). */
  capped?: boolean;
}

export const PAID_TOOLS: PaidTool[] = TOOLS.filter((t) => (t.level ?? 0) > 0).flatMap((t) => {
  const row: PaidTool = {
    slug: t.slug,
    name: t.name,
    level: t.level as Level,
    what: t.short,
    credits: t.engine === "server" ? (t.credits ?? 0) : 0,
    unit: t.unit ?? "file",
    capped: t.capped,
  };
  return t.premiumOption
    ? [row, { slug: t.slug, name: t.premiumOption.name, level: 3 as Level, what: t.premiumOption.what, credits: t.premiumOption.credits, unit: row.unit }]
    : [row];
});

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
