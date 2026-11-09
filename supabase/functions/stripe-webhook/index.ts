// Stripe tells Readily about payments here. This is the only place a plan changes.
// Deploy without JWT checks (Stripe signs its requests instead):
//   supabase functions deploy stripe-webhook --no-verify-jwt
import { env } from "../_shared/http.ts";
import * as db from "../_shared/db.ts";
import { describe, stripe, verifySignature, type Subscription } from "../_shared/stripe.ts";

async function userFor(sub: Subscription): Promise<string | null> {
  if (sub.metadata?.user_id) return sub.metadata.user_id;
  const [p] = await db.select<{ id: string }>("profiles", `select=id&stripe_customer_id=eq.${encodeURIComponent(sub.customer)}`);
  return p?.id ?? null;
}

async function apply(sub: Subscription, newPeriod: boolean) {
  const user = await userFor(sub);
  if (!user) {
    console.error(`No Readily user for subscription ${sub.id}`);
    return;
  }
  const d = describe(sub);
  if (!d.plan && ["active", "trialing"].includes(d.status)) {
    console.error(`Unknown price on subscription ${sub.id}; set the STRIPE_PRICE_* secrets.`);
    return;
  }
  await db.rpc("set_subscription", {
    p_user: user,
    p_plan: d.plan ?? "free",
    p_interval: d.interval,
    p_status: d.status,
    p_period_end: d.periodEnd,
    p_customer: sub.customer,
    p_subscription: sub.id,
    p_cancel_at_end: d.cancelAtEnd,
    p_new_period: newPeriod,
  });
}

Deno.serve(async (req) => {
  const payload = await req.text();
  const ok = await verifySignature(payload, req.headers.get("stripe-signature") ?? "", env("STRIPE_WEBHOOK_SECRET"));
  if (!ok) return new Response("bad signature", { status: 400 });
  const event = JSON.parse(payload) as { id: string; type: string; data: { object: Record<string, unknown> } };

  // Each event is applied once, even if Stripe sends it again.
  try {
    await db.insert("stripe_events", { id: event.id, type: event.type });
  } catch {
    return new Response("already handled", { status: 200 });
  }

  try {
    const obj = event.data.object;
    switch (event.type) {
      case "checkout.session.completed": {
        if (obj.mode === "subscription" && obj.subscription) {
          const sub = await stripe<Subscription>("GET", `/subscriptions/${obj.subscription}`);
          if (!sub.metadata?.user_id && obj.client_reference_id) sub.metadata = { ...(sub.metadata ?? {}), user_id: String(obj.client_reference_id) };
          await apply(sub, true);
        }
        break;
      }
      case "customer.subscription.created":
        await apply(obj as unknown as Subscription, true);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await apply(obj as unknown as Subscription, false);
        break;
      case "invoice.paid": {
        // A renewal: a fresh month (or year) has been paid for.
        const subId = (obj.subscription as string) ?? ((obj.parent as { subscription_details?: { subscription?: string } })?.subscription_details?.subscription);
        if (subId && obj.billing_reason === "subscription_cycle") {
          await apply(await stripe<Subscription>("GET", `/subscriptions/${subId}`), true);
        }
        break;
      }
    }
  } catch (e) {
    // Let Stripe retry: forget the event so the retry is processed.
    await db.remove("stripe_events", `id=eq.${encodeURIComponent(event.id)}`).catch(() => {});
    console.error(e);
    return new Response("error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
