// Paid plans through Paddle, the merchant of record (it handles payment, tax and
// invoices). Turned on with NEXT_PUBLIC_PAYMENTS_ENABLED=true once Paddle is set up
// (see docs/PADDLE.md); until then the plan buttons collect a waitlist.
import { getSupabase } from "./supabase";
import { loadPaddle } from "./paddle";
import type { PaidPlanId } from "./plans";

export const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
export type Interval = "month" | "year";

interface CheckoutDetails {
  priceId: string;
  environment: "production" | "sandbox";
  customer?: { id: string } | { email: string };
  customData: { user_id: string };
  successUrl: string;
}

async function call(body: object): Promise<{ url?: string; changed?: boolean; checkout?: CheckoutDetails }> {
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
    throw new Error("Couldn't reach the payment service. Check your connection and try again.");
  });
  const json = (await res.json().catch(() => ({}))) as { url?: string; checkout?: CheckoutDetails; error?: string };
  if (!res.ok || (!json.url && !json.checkout)) throw new Error(json.error || "The payment window couldn't be opened. Try again in a moment.");
  return json;
}

/** Opens Paddle's checkout for a plan. If the user already pays, switches their plan instead. */
export async function startCheckout(plan: PaidPlanId, interval: Interval): Promise<void> {
  const r = await call({ action: "checkout", plan, interval });
  if (r.url) {
    window.location.href = r.url;
    return;
  }
  const c = r.checkout!;
  const Paddle = await loadPaddle(c.environment);
  Paddle.Checkout.open({
    items: [{ priceId: c.priceId, quantity: 1 }],
    ...(c.customer ? { customer: c.customer } : {}),
    customData: c.customData,
    settings: { displayMode: "overlay", theme: "light", successUrl: c.successUrl, allowLogout: false },
  });
}

/** Opens Paddle's customer portal: payment method, invoices, cancel. */
export async function openPortal(): Promise<void> {
  const r = await call({ action: "portal" });
  if (r.url) window.location.href = r.url;
}
