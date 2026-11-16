// Paddle Billing: the merchant of record that sells Readily's plans.
// Secrets (set by the "Set up Paddle" GitHub workflow):
//   PADDLE_API_KEY            server-side API key (pdl_live_… or pdl_sdbx_…)
//   PADDLE_WEBHOOK_SECRET     signs Paddle's notifications to paddle-webhook (pdl_ntfset_…)
//   PADDLE_PRICE_<PLAN>_<INTERVAL>  e.g. PADDLE_PRICE_PRO_YEAR=pri_…
import { HttpError, env } from "./http.ts";

export const PLANS = ["basic", "pro", "premium"] as const;
export const INTERVALS = ["month", "year"] as const;
export type Plan = (typeof PLANS)[number];
export type Interval = (typeof INTERVALS)[number];

export function sandbox(): boolean {
  return (Deno.env.get("PADDLE_API_KEY") ?? "").startsWith("pdl_sdbx_") || Deno.env.get("PADDLE_ENV") === "sandbox";
}

const base = () => (sandbox() ? "https://sandbox-api.paddle.com" : "https://api.paddle.com");

export async function paddle<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env("PADDLE_API_KEY")}`, "Content-Type": "application/json", "Paddle-Version": "1" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { data?: T; error?: { detail?: string; code?: string } };
  if (!res.ok) {
    console.error("paddle", method, path, res.status, JSON.stringify(data?.error ?? {}));
    throw new HttpError(502, `The payment service said: ${data?.error?.detail ?? `error ${res.status}`}`);
  }
  return data.data as T;
}

export function priceFor(plan: Plan, interval: Interval): string {
  const id = Deno.env.get(`PADDLE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`);
  if (!id) throw new HttpError(503, "Paid plans aren't set up yet. Please try again later.");
  return id;
}

/** Which Readily plan a Paddle price belongs to (only our own six prices count). */
export function planForPrice(priceId: string | undefined): { plan: Plan; interval: Interval } | null {
  if (!priceId) return null;
  for (const plan of PLANS) {
    for (const interval of INTERVALS) {
      if (Deno.env.get(`PADDLE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`) === priceId) return { plan, interval };
    }
  }
  return null;
}

/** Checks the Paddle-Signature header ("ts=…;h1=…"): HMAC-SHA256 of "ts:rawBody". */
export async function verifySignature(raw: string, header: string, secret: string, toleranceSec = 300, now = Date.now()): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = header.split(";").map((p) => p.split("="));
  const ts = parts.find(([k]) => k === "ts")?.[1];
  const sigs = parts.filter(([k]) => k === "h1").map(([, v]) => v);
  if (!ts || !sigs.length || !/^\d+$/.test(ts)) return false;
  if (Math.abs(now / 1000 - Number(ts)) > toleranceSec) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${raw}`)));
  const expected = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => timingSafeEqual(s, expected));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface Subscription {
  id: string;
  status: string;
  customer_id: string;
  items?: { price?: { id?: string } }[];
  current_billing_period?: { starts_at: string; ends_at: string } | null;
  scheduled_change?: { action?: string; effective_at?: string } | null;
  custom_data?: Record<string, unknown> | null;
}

export function describe(sub: Subscription) {
  const match = planForPrice(sub.items?.[0]?.price?.id);
  return {
    plan: match?.plan ?? null,
    interval: match?.interval ?? null,
    status: sub.status,
    periodEnd: sub.current_billing_period?.ends_at ?? null,
    cancelAtEnd: sub.scheduled_change?.action === "cancel",
  };
}
