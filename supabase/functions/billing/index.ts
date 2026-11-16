// Starts a Paddle checkout for a plan, or opens Paddle's customer portal (update the
// payment method, see invoices, cancel). Paddle is the seller of record.
// Deploy: supabase functions deploy billing
import { HttpError, cors, env, json } from "../_shared/http.ts";
import * as db from "../_shared/db.ts";
import { paddle, priceFor, sandbox, type Interval, type Plan } from "../_shared/paddle.ts";

interface Profile {
  plan: string;
  billing_interval: string | null;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  subscription_status: string | null;
}

const site = () => env("SITE_URL").replace(/\/+$/, "");

async function portalUrl(profile: Profile): Promise<string> {
  if (!profile.paddle_customer_id) throw new HttpError(400, "You don't have a paid plan yet.");
  const session = await paddle<{ urls: { general: { overview: string } } }>("POST", `/customers/${profile.paddle_customer_id}/portal-sessions`, {
    subscription_ids: profile.paddle_subscription_id ? [profile.paddle_subscription_id] : [],
  });
  return session.urls.general.overview;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    const user = await db.userFromRequest(req);
    const body = (await req.json().catch(() => ({}))) as { action?: string; plan?: string; interval?: string };
    const [profile] = await db.select<Profile>("profiles", `select=plan,billing_interval,paddle_customer_id,paddle_subscription_id,subscription_status&id=eq.${user.id}`);
    if (!profile) throw new HttpError(403, "Your account isn't ready yet. Log out and in again.");
    const active = Boolean(profile.paddle_subscription_id) && ["active", "trialing", "past_due"].includes(profile.subscription_status ?? "");

    if (body.action === "portal") return json(req, { url: await portalUrl(profile) });

    if (body.action === "checkout") {
      const plan = String(body.plan ?? "") as Plan;
      const interval: Interval = body.interval === "year" ? "year" : "month";
      if (!["basic", "pro", "premium"].includes(plan)) throw new HttpError(400, "Pick a plan.");

      if (active) {
        // Already paying: switch the existing subscription. Paddle charges or credits the
        // difference for the rest of the period; the webhook then switches the plan here.
        if (profile.plan === plan && (profile.billing_interval ?? "month") === interval) {
          return json(req, { url: await portalUrl(profile) });
        }
        if (profile.subscription_status === "past_due") {
          throw new HttpError(409, "Your last payment didn't go through. Update your payment method in Manage billing first, then change plan.");
        }
        await paddle("PATCH", `/subscriptions/${profile.paddle_subscription_id}`, {
          items: [{ price_id: priceFor(plan, interval), quantity: 1 }],
          proration_billing_mode: "prorated_immediately",
          on_payment_failure: "prevent_change",
        });
        return json(req, { changed: true, url: `${site()}/billing/?welcome=${plan}` });
      }
      // The browser opens Paddle's checkout with exactly these details. Which plan a
      // payment turns on is decided later from the price Paddle reports, never from the browser.
      return json(req, {
        checkout: {
          priceId: priceFor(plan, interval),
          environment: sandbox() ? "sandbox" : "production",
          customer: profile.paddle_customer_id ? { id: profile.paddle_customer_id } : user.email ? { email: user.email } : undefined,
          customData: { user_id: user.id },
          successUrl: `${site()}/billing/?welcome=${plan}`,
        },
      });
    }
    throw new HttpError(400, "Unknown action.");
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json(req, { error: e instanceof Error ? e.message : "Something went wrong." }, status);
  }
});
