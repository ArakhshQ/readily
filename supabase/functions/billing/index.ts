// Starts a Stripe Checkout for a plan, or opens the Stripe customer portal to
// change plan, update a card or cancel. Deploy: supabase functions deploy billing
import { HttpError, cors, env, json } from "../_shared/http.ts";
import * as db from "../_shared/db.ts";
import { priceFor, stripe } from "../_shared/stripe.ts";

interface Profile {
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
}

const site = () => env("SITE_URL").replace(/\/+$/, "");

async function customerFor(user: { id: string; email?: string }, profile: Profile): Promise<string> {
  if (profile.stripe_customer_id) return profile.stripe_customer_id;
  const c = await stripe<{ id: string }>("POST", "/customers", { email: user.email, metadata: { user_id: user.id } });
  await db.update("profiles", `id=eq.${user.id}`, { stripe_customer_id: c.id });
  return c.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    const user = await db.userFromRequest(req);
    const body = (await req.json().catch(() => ({}))) as { action?: string; plan?: string; interval?: string };
    const [profile] = await db.select<Profile>("profiles", `select=plan,stripe_customer_id,stripe_subscription_id,subscription_status&id=eq.${user.id}`);
    if (!profile) throw new HttpError(403, "Your account isn't ready yet. Log out and in again.");
    const active = profile.stripe_subscription_id && ["active", "trialing", "past_due"].includes(profile.subscription_status ?? "");

    if (body.action === "portal" || (body.action === "checkout" && active)) {
      if (!profile.stripe_customer_id) throw new HttpError(400, "You don't have a paid plan yet.");
      const session = await stripe<{ url: string }>("POST", "/billing_portal/sessions", {
        customer: profile.stripe_customer_id,
        return_url: `${site()}/dashboard/`,
        configuration: Deno.env.get("STRIPE_PORTAL_CONFIGURATION") || undefined,
        ...(body.action === "checkout" && active
          ? { flow_data: { type: "subscription_update", subscription_update: { subscription: profile.stripe_subscription_id } } }
          : {}),
      });
      return json(req, { url: session.url });
    }

    if (body.action === "checkout") {
      const plan = String(body.plan ?? "");
      const interval = body.interval === "year" ? "year" : "month";
      if (!["basic", "pro", "premium"].includes(plan)) throw new HttpError(400, "Pick a plan.");
      const customer = await customerFor(user, profile);
      const tax = Deno.env.get("STRIPE_AUTOMATIC_TAX") === "true";
      const session = await stripe<{ url: string }>("POST", "/checkout/sessions", {
        mode: "subscription",
        customer,
        client_reference_id: user.id,
        line_items: [{ price: priceFor(plan, interval), quantity: 1 }],
        subscription_data: { metadata: { user_id: user.id } },
        metadata: { user_id: user.id },
        allow_promotion_codes: "true",
        billing_address_collection: "auto",
        ...(tax ? { automatic_tax: { enabled: "true" }, customer_update: { address: "auto", name: "auto" } } : {}),
        success_url: `${site()}/billing/?welcome=${plan}`,
        cancel_url: `${site()}/pricing/?canceled=1`,
      });
      return json(req, { url: session.url });
    }
    throw new HttpError(400, "Unknown action.");
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json(req, { error: e instanceof Error ? e.message : "Something went wrong." }, status);
  }
});
