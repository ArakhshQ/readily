import { assert, assertEquals } from "./assert.ts";
import { loadFunction, reset, setEnv, state } from "./mock.ts";

setEnv();
const billing = await loadFunction("../billing/index.ts");
const webhook = await loadFunction("../paddle-webhook/index.ts");

const UA = "11111111-1111-4111-8111-111111111111";
const UB = "22222222-2222-4222-8222-222222222222";

async function call(uid: string, body: Record<string, unknown>) {
  const res = await billing(new Request("https://fn.test/billing", { method: "POST", headers: { authorization: `Bearer ${uid}` }, body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
}
async function sign(payload: string, secret: string, ts: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${payload}`)));
  return [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
}
let n = 0;
async function hook(type: string, data: Record<string, unknown>, opts: { secret?: string; id?: string; at?: string; ts?: number } = {}) {
  const payload = JSON.stringify({ event_id: opts.id ?? `evt_${++n}`, event_type: type, occurred_at: opts.at ?? new Date(Date.now() + n * 1000).toISOString(), notification_id: "ntf_1", data });
  const ts = opts.ts ?? Math.floor(Date.now() / 1000);
  const sig = await sign(payload, opts.secret ?? "pdl_ntfset_secret", ts);
  const res = await webhook(new Request("https://fn.test/hook", { method: "POST", headers: { "paddle-signature": `ts=${ts};h1=${sig}` }, body: payload }));
  return res.status;
}
const sub = (over: Record<string, unknown> = {}) => ({
  id: "sub_1",
  status: "active",
  customer_id: "ctm_1",
  items: [{ price: { id: "pri_pro_m" }, quantity: 1 }],
  current_billing_period: { starts_at: "2026-11-16T00:00:00Z", ends_at: "2026-12-16T00:00:00Z" },
  scheduled_change: null,
  custom_data: { user_id: UA },
  ...over,
});
const user = (id: string, extra: Record<string, unknown> = {}) =>
  state.profiles.push({ id, plan: "free", credits: 20, paddle_customer_id: null, paddle_subscription_id: null, subscription_status: null, billing_event_at: null, ...extra });

Deno.test("checkout: returns the right Paddle price and the user's id, never trusts the browser's price", async () => {
  reset();
  user(`user-${UA}`);
  const r = await call(`user-${UA}`, { action: "checkout", plan: "pro", interval: "year", priceId: "pri_fake" });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals(r.body.checkout.priceId, "pri_pro_y");
  assertEquals(r.body.checkout.customData.user_id, `user-${UA}`);
  assertEquals(r.body.checkout.environment, "production");
  assertEquals(r.body.checkout.customer.email, `user-${UA}@example.com`);
  assert(String(r.body.checkout.successUrl).startsWith("https://readily.test/billing/?welcome=pro"));
  assertEquals((await call(`user-${UA}`, { action: "checkout", plan: "gold" })).status, 400);
  assertEquals((await call("nobody", { action: "checkout", plan: "pro" })).status, 401);
});

Deno.test("already subscribed: another plan switches the subscription; the same plan opens the portal", async () => {
  reset();
  user(`user-${UA}`, { plan: "basic", billing_interval: "month", paddle_customer_id: "ctm_1", paddle_subscription_id: "sub_1", subscription_status: "active" });
  const r = await call(`user-${UA}`, { action: "checkout", plan: "premium", interval: "year" });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assertEquals(r.body.changed, true);
  assertEquals(r.body.url, "https://readily.test/billing/?welcome=premium");
  const patch = state.paddleBodies.find((b) => b.path === "/subscriptions/sub_1")!;
  assertEquals(patch.body.items, [{ price_id: "pri_prem_y", quantity: 1 }]);
  assertEquals(patch.body.proration_billing_mode, "prorated_immediately");
  assertEquals(state.profiles[0].plan, "basic", "the plan only changes when Paddle confirms it");
  const same = await call(`user-${UA}`, { action: "checkout", plan: "basic", interval: "month" });
  assertEquals(same.body.url, "https://customer-portal.paddle.test/ctm_1?subs=sub_1");
  const p = await call(`user-${UA}`, { action: "portal" });
  assertEquals(p.body.url, "https://customer-portal.paddle.test/ctm_1?subs=sub_1");
  state.profiles[0].subscription_status = "past_due";
  const due = await call(`user-${UA}`, { action: "checkout", plan: "pro", interval: "month" });
  assertEquals(due.status, 409);
});

Deno.test("portal without a paid plan explains why", async () => {
  reset();
  user(`user-${UA}`);
  const p = await call(`user-${UA}`, { action: "portal" });
  assertEquals(p.status, 400);
  assert(String(p.body.error).includes("paid plan"));
});

Deno.test("webhook: wrong secret, old timestamp and missing signature are rejected", async () => {
  reset();
  user(UA);
  assertEquals(await hook("subscription.created", sub(), { secret: "wrong" }), 400);
  assertEquals(await hook("subscription.created", sub(), { ts: Math.floor(Date.now() / 1000) - 3600 }), 400);
  const res = await webhook(new Request("https://fn.test/hook", { method: "POST", body: "{}" }));
  assertEquals(res.status, 400);
  assertEquals(state.profiles[0].plan, "free", "nothing changed");
});

Deno.test("webhook: a new subscription turns on the plan and its credits, once", async () => {
  reset();
  user(UA);
  assertEquals(await hook("subscription.created", sub(), { id: "evt_same" }), 200);
  assertEquals(state.profiles[0].plan, "pro");
  assertEquals(state.profiles[0].credits, 700);
  assertEquals(state.profiles[0].paddle_customer_id, "ctm_1");
  state.profiles[0].credits = 5;
  assertEquals(await hook("subscription.created", sub(), { id: "evt_same" }), 200); // sent again by Paddle
  assertEquals(state.profiles[0].credits, 5, "not applied twice");
});

Deno.test("webhook: a price that isn't one of ours, or an unknown user, changes nothing", async () => {
  reset();
  user(UA);
  assertEquals(await hook("subscription.created", sub({ items: [{ price: { id: "pri_someone_else" } }] })), 200);
  assertEquals(state.profiles[0].plan, "free");
  assertEquals(await hook("subscription.created", sub({ custom_data: { user_id: UB }, customer_id: "ctm_unknown" })), 200);
  assertEquals(state.profiles[0].plan, "free");
});

Deno.test("webhook: renewal refills credits; failed renewal keeps the plan; cancel ends it", async () => {
  reset();
  user(UA, { plan: "premium", credits: 3, paddle_customer_id: "ctm_1", paddle_subscription_id: "sub_1", subscription_status: "active" });
  state.subscriptions.set("sub_1", sub({ items: [{ price: { id: "pri_prem_m" } }] }));
  assertEquals(await hook("transaction.completed", { id: "txn_1", origin: "subscription_recurring", subscription_id: "sub_1", status: "completed" }), 200);
  assertEquals(state.profiles[0].credits, 2000);
  // A checkout's own first payment doesn't refill again (subscription.created did that).
  state.profiles[0].credits = 10;
  assertEquals(await hook("transaction.completed", { id: "txn_2", origin: "web", subscription_id: "sub_1", status: "completed" }), 200);
  assertEquals(state.profiles[0].credits, 10);
  assertEquals(await hook("subscription.past_due", sub({ status: "past_due", items: [{ price: { id: "pri_prem_m" } }] })), 200);
  assertEquals(state.profiles[0].plan, "premium", "Paddle is retrying the card");
  assertEquals(await hook("subscription.updated", sub({ status: "active", scheduled_change: { action: "cancel", effective_at: "2026-12-16T00:00:00Z" }, items: [{ price: { id: "pri_prem_m" } }] })), 200);
  assertEquals(state.profiles[0].cancel_at_period_end, true);
  assertEquals(await hook("subscription.canceled", sub({ status: "canceled", current_billing_period: null, items: [{ price: { id: "pri_prem_m" } }] })), 200);
  assertEquals(state.profiles[0].plan, "free");
  assertEquals(state.profiles[0].credits, 0);
});

Deno.test("webhook: an older notification arriving late doesn't undo a newer one", async () => {
  reset();
  user(UA);
  assertEquals(await hook("subscription.canceled", sub({ status: "canceled" }), { at: "2026-11-20T10:00:00Z" }), 200);
  assertEquals(await hook("subscription.created", sub(), { at: "2026-11-16T10:00:00Z" }), 200);
  assertEquals(state.profiles[0].plan, "free", "the stale 'created' was ignored");
});

Deno.test("webhook: a server error lets Paddle retry the same notification", async () => {
  reset();
  user(UA, { plan: "pro", paddle_subscription_id: "sub_9", subscription_status: "active" });
  // The renewal's subscription can't be read (not in the mock), so the handler fails...
  assertEquals(await hook("transaction.completed", { id: "txn_9", origin: "subscription_recurring", subscription_id: "sub_9" }, { id: "evt_retry" }), 500);
  assertEquals(state.billing_events.length, 0, "forgotten so the retry runs");
  // ...and succeeds when Paddle retries.
  state.subscriptions.set("sub_9", sub({ id: "sub_9" }));
  assertEquals(await hook("transaction.completed", { id: "txn_9", origin: "subscription_recurring", subscription_id: "sub_9" }, { id: "evt_retry" }), 200);
  assertEquals(state.profiles[0].credits, 700);
});

Deno.test("webhook: switching plans mid-month adds only the extra credits for the days left", async () => {
  reset();
  const in15 = new Date(Date.now() + 15 * 86400e3).toISOString();
  user(UA, { plan: "basic", credits: 150, credits_refresh_at: in15, paddle_customer_id: "ctm_1", paddle_subscription_id: "sub_1", subscription_status: "active" });
  assertEquals(await hook("subscription.updated", sub({ items: [{ price: { id: "pri_prem_m" } }] })), 200);
  assertEquals(state.profiles[0].plan, "premium");
  assertEquals(state.profiles[0].credits, 1050);
  assertEquals(await hook("subscription.updated", sub({ items: [{ price: { id: "pri_basic_m" } }] })), 200);
  assertEquals(state.profiles[0].credits, 200, "a downgrade never adds credits");
});
