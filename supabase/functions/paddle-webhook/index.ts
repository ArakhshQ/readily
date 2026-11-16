// Paddle tells Readily about payments here. This is the only place a plan changes.
// Every notification is checked against PADDLE_WEBHOOK_SECRET before anything happens.
// Deploy without the login check (Paddle signs its requests instead):
//   supabase functions deploy paddle-webhook --no-verify-jwt
import { env } from "../_shared/http.ts";
import * as db from "../_shared/db.ts";
import { describe, paddle, verifySignature, type Subscription } from "../_shared/paddle.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Event {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: Record<string, unknown>;
}

/** The Readily account a subscription belongs to: from the checkout, or a known Paddle customer. */
async function userFor(sub: Subscription): Promise<string | null> {
  const fromCheckout = String(sub.custom_data?.user_id ?? "");
  if (UUID.test(fromCheckout)) {
    const [p] = await db.select<{ id: string }>("profiles", `select=id&id=eq.${fromCheckout}`);
    if (p) return p.id;
  }
  if (sub.customer_id) {
    const [p] = await db.select<{ id: string }>("profiles", `select=id&paddle_customer_id=eq.${encodeURIComponent(sub.customer_id)}`);
    if (p) return p.id;
  }
  return null;
}

async function apply(sub: Subscription, newPeriod: boolean, eventAt: string) {
  const user = await userFor(sub);
  if (!user) {
    console.error(`No Readily account for Paddle subscription ${sub.id}`);
    return;
  }
  const d = describe(sub);
  if (!d.plan) {
    console.error(`Subscription ${sub.id} uses a price that isn't one of Readily's plans; ignored.`);
    return;
  }
  const result = await db.rpc<string>("apply_paddle_subscription", {
    p_user: user,
    p_plan: d.plan,
    p_interval: d.interval,
    p_status: d.status,
    p_period_end: d.periodEnd,
    p_customer: sub.customer_id ?? null,
    p_subscription: sub.id,
    p_cancel_at_end: d.cancelAtEnd,
    p_new_period: newPeriod,
    p_event_at: eventAt,
  });
  if (result !== "applied") console.log(`Subscription ${sub.id}: ${result}, not applied`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });
  const raw = await req.text();
  const ok = await verifySignature(raw, req.headers.get("paddle-signature") ?? "", env("PADDLE_WEBHOOK_SECRET"));
  if (!ok) return new Response("bad signature", { status: 400 });
  const event = JSON.parse(raw) as Event;
  if (!event.event_id || !event.event_type) return new Response("not an event", { status: 400 });

  // Each notification is applied once, even if Paddle sends it again.
  try {
    await db.insert("billing_events", { id: event.event_id, type: event.event_type });
  } catch {
    return new Response("already handled", { status: 200 });
  }

  try {
    const type = event.event_type;
    if (type.startsWith("subscription.")) {
      // created: a new plan starts with its full allowance. Other updates keep the credits
      // unless the plan itself changed (handled in the database).
      await apply(event.data as unknown as Subscription, type === "subscription.created", event.occurred_at);
    } else if (type === "transaction.completed") {
      const t = event.data as { origin?: string; subscription_id?: string | null };
      if (t.origin === "subscription_recurring" && t.subscription_id) {
        // A renewal was paid: read the subscription as it is now and refill the credits.
        const sub = await paddle<Subscription>("GET", `/subscriptions/${t.subscription_id}`);
        await apply(sub, true, new Date().toISOString());
      }
    }
  } catch (e) {
    // Let Paddle retry: forget the event so the retry is processed.
    await db.remove("billing_events", `id=eq.${encodeURIComponent(event.event_id)}`).catch(() => {});
    console.error(e);
    return new Response("error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
});
