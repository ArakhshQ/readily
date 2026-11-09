// Stripe over plain HTTP (form-encoded), plus webhook signature checking.
import { HttpError, env } from "./http.ts";

const API = "https://api.stripe.com/v1";
export const STRIPE_VERSION = "2024-06-20";

function encode(obj: Record<string, unknown>, prefix = "", out: string[] = []): string[] {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object" && !Array.isArray(v)) encode(v as Record<string, unknown>, key, out);
    else if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" ? encode(item as Record<string, unknown>, `${key}[${i}]`, out) : out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`)));
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}
export const formBody = (obj: Record<string, unknown>) => encode(obj).join("&");

export async function stripe<T>(method: "GET" | "POST", path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`,
      "Stripe-Version": STRIPE_VERSION,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? formBody(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(502, `Payments: ${data?.error?.message ?? res.status}`);
  return data as T;
}

/** Plan and billing interval for each Stripe price, from STRIPE_PRICE_<PLAN>_<INTERVAL>. */
export function priceTable(): Record<string, { plan: string; interval: "month" | "year" }> {
  const t: Record<string, { plan: string; interval: "month" | "year" }> = {};
  for (const plan of ["basic", "pro", "premium"]) {
    for (const interval of ["month", "year"] as const) {
      const id = Deno.env.get(`STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`);
      if (id) t[id] = { plan, interval };
    }
  }
  return t;
}

export function priceFor(plan: string, interval: string): string {
  return env(`STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`);
}

function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Checks the Stripe-Signature header (HMAC-SHA256 of "timestamp.payload"). */
export async function verifySignature(payload: string, header: string, secret: string, now = Date.now(), toleranceSec = 300): Promise<boolean> {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p.length === 2)) as Record<string, string>;
  const t = Number(parts.t);
  const sigs = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  if (!t || !sigs.length) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`)));
  return sigs.some((s) => s.length === expected.length && timingSafeEqual(s, expected));
}

function timingSafeEqual(a: string, b: string) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export interface Subscription {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items: { data: { price: { id: string }; current_period_end?: number }[] };
}

/** What a subscription means for Readily: plan, interval, status and period end. */
export function describe(sub: Subscription) {
  const item = sub.items?.data?.[0];
  const price = item?.price?.id ?? "";
  const known = priceTable()[price];
  const end = sub.current_period_end ?? item?.current_period_end ?? null;
  return {
    plan: known?.plan ?? null,
    interval: known?.interval ?? null,
    status: sub.status,
    periodEnd: end ? new Date(end * 1000).toISOString() : null,
    cancelAtEnd: !!sub.cancel_at_period_end,
  };
}
