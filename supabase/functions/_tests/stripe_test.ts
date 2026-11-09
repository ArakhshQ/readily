import { assert, assertEquals } from "./assert.ts";
import { describe, formBody, verifySignature } from "../_shared/stripe.ts";

async function sign(payload: string, secret: string, t: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`)));
  return [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("webhook signatures", async () => {
  const t = Math.floor(Date.now() / 1000);
  const body = '{"id":"evt_1"}';
  const good = await sign(body, "whsec_test", t);
  assert(await verifySignature(body, `t=${t},v1=${good}`, "whsec_test"));
  assert(await verifySignature(body, `t=${t},v1=bad,v1=${good}`, "whsec_test"), "any v1 may match");
  assert(!(await verifySignature(body, `t=${t},v1=${good}`, "whsec_other")), "wrong secret");
  assert(!(await verifySignature(body + " ", `t=${t},v1=${good}`, "whsec_test")), "tampered body");
  assert(!(await verifySignature(body, `t=${t - 1000},v1=${await sign(body, "whsec_test", t - 1000)}`, "whsec_test")), "too old");
  assert(!(await verifySignature(body, "", "whsec_test")));
});

Deno.test("form encoding for Stripe", () => {
  assertEquals(
    formBody({ mode: "subscription", line_items: [{ price: "price_1", quantity: 1 }], metadata: { user_id: "u1" }, skip: undefined }),
    "mode=subscription&line_items%5B0%5D%5Bprice%5D=price_1&line_items%5B0%5D%5Bquantity%5D=1&metadata%5Buser_id%5D=u1",
  );
});

Deno.test("subscription to plan", () => {
  Deno.env.set("STRIPE_PRICE_PRO_YEAR", "price_pro_y");
  const d = describe({ id: "sub_1", customer: "cus_1", status: "active", cancel_at_period_end: true, items: { data: [{ price: { id: "price_pro_y" }, current_period_end: 1893456000 }] } });
  assertEquals(d, { plan: "pro", interval: "year", status: "active", periodEnd: "2030-01-01T00:00:00.000Z", cancelAtEnd: true });
});
