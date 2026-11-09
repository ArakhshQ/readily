import { assert, assertEquals } from "./assert.ts";
import { loadFunction, reset, setEnv, state } from "./mock.ts";

setEnv();
const billing = await loadFunction("../billing/index.ts");
const webhook = await loadFunction("../stripe-webhook/index.ts");

async function call(uid: string, body: Record<string, unknown>) {
  const res = await billing(new Request("https://fn.test/billing", { method: "POST", headers: { authorization: `Bearer ${uid}` }, body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
}
async function hook(event: Record<string, unknown>, secret = "whsec_test") {
  const payload = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`)))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const res = await webhook(new Request("https://fn.test/hook", { method: "POST", headers: { "stripe-signature": `t=${t},v1=${sig}` }, body: payload }));
  return res.status;
}

Deno.test("checkout: creates a customer and a session for the right price", async () => {
  reset();
  state.profiles.push({ id: "user-a", plan: "free", credits: 20, stripe_customer_id: null, stripe_subscription_id: null, subscription_status: null });
  const r = await call("user-a", { action: "checkout", plan: "pro", interval: "year" });
  assertEquals(r.status, 200, JSON.stringify(r.body));
  assert(String(r.body.url).includes("price=price_pro_y") && String(r.body.url).includes("user=user-a"), r.body.url);
  assertEquals(state.profiles[0].stripe_customer_id, "cus_new");
  assertEquals((await call("user-a", { action: "checkout", plan: "gold" })).status, 400);
});

Deno.test("checkout when already subscribed opens a plan change instead", async () => {
  reset();
  state.profiles.push({ id: "user-a", plan: "basic", credits: 10, stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1", subscription_status: "active" });
  const r = await call("user-a", { action: "checkout", plan: "premium", interval: "month" });
  assertEquals(r.body.url, "https://billing.stripe.test/p?flow=subscription_update");
  const p = await call("user-a", { action: "portal" });
  assertEquals(p.body.url, "https://billing.stripe.test/p?flow=none");
});

Deno.test("webhook: bad signature is rejected", async () => {
  reset();
  assertEquals(await hook({ id: "evt_x", type: "invoice.paid", data: { object: {} } }, "whsec_wrong"), 400);
});

Deno.test("webhook: paid checkout turns on the plan and its credits, once", async () => {
  reset();
  state.profiles.push({ id: "user-a", plan: "free", credits: 20, stripe_customer_id: "cus_1" });
  state.subscriptions.set("sub_1", { id: "sub_1", customer: "cus_1", status: "active", cancel_at_period_end: false, metadata: {}, items: { data: [{ price: { id: "price_pro_m" }, current_period_end: 1893456000 }] } });
  const ev = { id: "evt_1", type: "checkout.session.completed", data: { object: { mode: "subscription", subscription: "sub_1", client_reference_id: "user-a" } } };
  assertEquals(await hook(ev), 200);
  assertEquals(state.profiles[0].plan, "pro");
  assertEquals(state.profiles[0].credits, 700);
  state.profiles[0].credits = 5;
  assertEquals(await hook(ev), 200); // replayed by Stripe
  assertEquals(state.profiles[0].credits, 5, "not applied twice");
});

Deno.test("webhook: renewal refreshes credits, cancellation ends the plan", async () => {
  reset();
  state.profiles.push({ id: "user-a", plan: "premium", credits: 3, stripe_customer_id: "cus_1" });
  const sub = { id: "sub_1", customer: "cus_1", status: "active", cancel_at_period_end: false, metadata: { user_id: "user-a" }, items: { data: [{ price: { id: "price_prem_m" } }] } };
  state.subscriptions.set("sub_1", sub);
  assertEquals(await hook({ id: "evt_2", type: "invoice.paid", data: { object: { subscription: "sub_1", billing_reason: "subscription_cycle" } } }), 200);
  assertEquals(state.profiles[0].credits, 2000);
  assertEquals(await hook({ id: "evt_3", type: "customer.subscription.deleted", data: { object: { ...sub, status: "canceled" } } }), 200);
  assertEquals(state.profiles[0].plan, "free");
  assertEquals(state.profiles[0].credits, 0);
});
