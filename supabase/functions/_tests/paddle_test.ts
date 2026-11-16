import { assert, assertEquals } from "./assert.ts";
import { describe, planForPrice, verifySignature } from "../_shared/paddle.ts";
import { setEnv } from "./mock.ts";

setEnv();

async function sign(payload: string, secret: string, ts: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${payload}`)));
  return [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("Paddle signatures", async () => {
  const ts = Math.floor(Date.now() / 1000);
  const body = '{"event_id":"evt_1"}';
  const good = await sign(body, "pdl_ntfset_x", ts);
  assert(await verifySignature(body, `ts=${ts};h1=${good}`, "pdl_ntfset_x"));
  assert(await verifySignature(body, `ts=${ts};h1=bad;h1=${good}`, "pdl_ntfset_x"), "any h1 may match (secret rotation)");
  assert(!(await verifySignature(body, `ts=${ts};h1=${good}`, "pdl_ntfset_other")), "wrong secret");
  assert(!(await verifySignature(body + " ", `ts=${ts};h1=${good}`, "pdl_ntfset_x")), "changed body");
  assert(!(await verifySignature(body, `ts=${ts - 600};h1=${await sign(body, "pdl_ntfset_x", ts - 600)}`, "pdl_ntfset_x")), "too old");
  assert(!(await verifySignature(body, "", "pdl_ntfset_x")));
  assert(!(await verifySignature(body, `ts=${ts};h1=${good}`, "")), "no secret configured");
});

Deno.test("only Readily's own prices map to plans", () => {
  assertEquals(planForPrice("pri_pro_y"), { plan: "pro", interval: "year" });
  assertEquals(planForPrice("pri_other"), null);
  assertEquals(planForPrice(undefined), null);
  const d = describe({ id: "sub_1", status: "active", customer_id: "ctm_1", items: [{ price: { id: "pri_basic_m" } }], scheduled_change: { action: "cancel" }, current_billing_period: { starts_at: "a", ends_at: "2026-12-01T00:00:00Z" } });
  assertEquals(d, { plan: "basic", interval: "month", status: "active", periodEnd: "2026-12-01T00:00:00Z", cancelAtEnd: true });
});
