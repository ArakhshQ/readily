// Paid plans through Stripe. Turned on with NEXT_PUBLIC_PAYMENTS_ENABLED=true once the
// Stripe keys are set on the server (see docs/LAUNCH.md); until then plans collect a waitlist.
import { getSupabase } from "./supabase";
import type { PaidPlanId } from "./plans";

export const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
export type Interval = "month" | "year";

async function call(body: object): Promise<{ url: string }> {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Log in first.");
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const res = await fetch(`${base}/functions/v1/billing`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
    body: JSON.stringify(body),
  }).catch(() => {
    throw new Error("Couldn't reach the payment page. Check your connection and try again.");
  });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error || "The payment page couldn't be opened. Try again in a moment.");
  return { url: json.url };
}

/** Sends the user to Stripe Checkout (or to a plan change if they already pay). */
export async function startCheckout(plan: PaidPlanId, interval: Interval): Promise<void> {
  const { url } = await call({ action: "checkout", plan, interval });
  window.location.href = url;
}

/** Opens Stripe's billing portal: change plan, update card, see invoices, cancel. */
export async function openPortal(): Promise<void> {
  const { url } = await call({ action: "portal" });
  window.location.href = url;
}
