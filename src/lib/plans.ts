// Readily plans. Every tool is free without an account; plans add a personal
// dashboard, cloud storage and (later) AI. Paid checkout opens when payments are connected.

export type PlanId = "free" | "pro" | "ai-plus";

export interface PlanFeature {
  text: string;
  soon?: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: PlanFeature[];
  /** Cloud storage for saved files, in bytes. Used by the dashboard. */
  storageBytes: number;
  /** How long history is kept, in days (0 = forever). */
  historyDays: number;
  /** True while checkout isn't connected: the button joins the waitlist. */
  waitlist: boolean;
  highlight?: boolean;
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Every tool, no account needed. Sign up free to get your own dashboard.",
    storageBytes: 100 * MB,
    historyDays: 30,
    waitlist: false,
    features: [
      { text: "All 20 tools for PDFs, images, video and audio" },
      { text: "Files are processed on your device, never uploaded" },
      { text: "No watermarks, no daily limits" },
      { text: "With a free account: history of your last 30 days" },
      { text: "With a free account: save up to 100 MB of files" },
      { text: "With a free account: pick up your files on any device" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$4.99",
    period: "per month",
    tagline: "For people who handle files every week.",
    storageBytes: 10 * GB,
    historyDays: 0,
    waitlist: true,
    highlight: true,
    features: [
      { text: "Everything in Free" },
      { text: "10 GB of saved files" },
      { text: "Full history, kept as long as you like" },
      { text: "Folders to organize saved files", soon: true },
      { text: "Saved settings you reuse in one click", soon: true },
      { text: "Priority email support" },
    ],
  },
  {
    id: "ai-plus",
    name: "AI Plus",
    price: "$9.99",
    period: "per month",
    tagline: "Describe the result and let Readily do the steps.",
    storageBytes: 50 * GB,
    historyDays: 0,
    waitlist: true,
    features: [
      { text: "Everything in Pro" },
      { text: "50 GB of saved files" },
      { text: "Ask in plain words: “these scans as one PDF under 2 MB”", soon: true },
      { text: "Summarize and ask questions about PDFs", soon: true },
      { text: "Translate documents", soon: true },
      { text: "Text recognition in more languages", soon: true },
    ],
  },
];

export const PLAN_BY_ID: Record<PlanId, Plan> = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<PlanId, Plan>;

/** The short list of reasons to sign up, used by the reminder and signup page. */
export const SIGNUP_REASONS = [
  "Keep a history of everything you make",
  "Save files and open them on any device",
  "Be first to get Pro and AI Plus",
];
