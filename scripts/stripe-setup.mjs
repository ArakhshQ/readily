// One-time Stripe setup for Readily. Creates the Basic, Pro and Premium products with
// monthly and yearly prices, the webhook that tells Readily about payments, and the
// customer portal (change plan, update card, invoices, cancel). Safe to run again.
//
//   STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-setup.mjs https://YOUR-PROJECT.supabase.co https://your-site.com
//
// Then paste the printed "supabase secrets set" command into your terminal.

const KEY = process.env.STRIPE_SECRET_KEY;
const API = process.env.STRIPE_API_BASE ?? "https://api.stripe.com/v1";
const args = process.argv.slice(2);
const envFileAt = args.indexOf("--save-to");
const envFile = envFileAt >= 0 ? args[envFileAt + 1] : null;
const [supabaseUrl, siteUrl] = args.filter((_, i) => envFileAt < 0 || (i !== envFileAt && i !== envFileAt + 1));

if (!KEY || !supabaseUrl || !siteUrl) {
  console.error("Usage: STRIPE_SECRET_KEY=sk_... node scripts/stripe-setup.mjs https://YOUR-PROJECT.supabase.co https://your-site.com");
  process.exit(1);
}

const PLANS = [
  { id: "basic", name: "Readily Basic", month: 499, year: 4900, description: "Pro-quality on-device tools, PDF to Word, searchable scans, 200 AI credits a month." },
  { id: "pro", name: "Readily Pro", month: 1199, year: 11900, description: "Studio voice, subtitles, translation, photo restoration, 700 AI credits a month." },
  { id: "premium", name: "Readily Premium", month: 2999, year: 29900, description: "Best-quality AI voice, dubbing, video and image AI, 2,000 AI credits a month." },
];
const EVENTS = ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.paid"];

function encode(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" ? encode(item, `${key}[${i}]`, out) : out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(item)}`)));
    else if (typeof v === "object") encode(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}

async function stripe(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Stripe-Version": "2024-06-20",
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: body ? encode(body).join("&") : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path}: ${data?.error?.message ?? res.status}`);
  return data;
}

const live = KEY.startsWith("sk_live_");
console.log(`Setting up Stripe in ${live ? "LIVE" : "TEST"} mode…\n`);

const priceIds = {};
const portalProducts = [];
for (const plan of PLANS) {
  const lookups = [`readily_${plan.id}_month`, `readily_${plan.id}_year`];
  const existing = await stripe("GET", `/prices?active=true&limit=10&${lookups.map((l) => `lookup_keys[]=${l}`).join("&")}`);
  const byKey = Object.fromEntries(existing.data.map((p) => [p.lookup_key, p]));
  let productId = existing.data[0]?.product;
  if (!productId) {
    const product = await stripe("POST", "/products", { name: plan.name, description: plan.description, metadata: { readily_plan: plan.id } });
    productId = product.id;
    console.log(`  created product ${plan.name}`);
  }
  for (const interval of ["month", "year"]) {
    const lookup = `readily_${plan.id}_${interval}`;
    let price = byKey[lookup];
    if (!price) {
      price = await stripe("POST", "/prices", {
        product: productId,
        currency: "usd",
        unit_amount: plan[interval],
        recurring: { interval },
        lookup_key: lookup,
        tax_behavior: "exclusive",
        metadata: { readily_plan: plan.id, interval },
      });
      console.log(`  created price ${lookup} ($${(plan[interval] / 100).toFixed(2)}/${interval})`);
    }
    priceIds[`STRIPE_PRICE_${plan.id.toUpperCase()}_${interval.toUpperCase()}`] = price.id;
  }
  portalProducts.push({ product: productId, prices: [priceIds[`STRIPE_PRICE_${plan.id.toUpperCase()}_MONTH`], priceIds[`STRIPE_PRICE_${plan.id.toUpperCase()}_YEAR`]] });
}

// Webhook: Stripe only shows the signing secret when the endpoint is created.
const hookUrl = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/stripe-webhook`;
const hooks = await stripe("GET", "/webhook_endpoints?limit=100");
let secret = null;
const old = hooks.data.find((h) => h.url === hookUrl);
if (old) {
  console.log(`  webhook already exists (${old.id}); keeping your existing STRIPE_WEBHOOK_SECRET`);
  await stripe("POST", `/webhook_endpoints/${old.id}`, { enabled_events: EVENTS });
} else {
  const hook = await stripe("POST", "/webhook_endpoints", { url: hookUrl, enabled_events: EVENTS, api_version: "2024-06-20", description: "Readily plans" });
  secret = hook.secret;
  console.log(`  created webhook ${hookUrl}`);
}

// Customer portal: change plan, update card, invoices, cancel at period end.
const site = siteUrl.replace(/\/+$/, "");
const portal = {
  business_profile: { headline: "Manage your Readily plan", privacy_policy_url: `${site}/privacy/`, terms_of_service_url: `${site}/terms/` },
  default_return_url: `${site}/dashboard/`,
  features: {
    customer_update: { enabled: true, allowed_updates: ["email", "address", "tax_id"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "unused", "other"] } },
    subscription_update: { enabled: true, default_allowed_updates: ["price"], proration_behavior: "create_prorations", products: portalProducts },
  },
};
let portalId = null;
try {
  const configs = await stripe("GET", "/billing_portal/configurations?is_default=true&limit=1");
  if (configs.data[0]) {
    await stripe("POST", `/billing_portal/configurations/${configs.data[0].id}`, portal);
    console.log("  customer portal updated");
  } else {
    portalId = (await stripe("POST", "/billing_portal/configurations", portal)).id;
    console.log("  customer portal created");
  }
} catch (e) {
  console.log(`  (portal) ${e.message}. Set it up in Stripe > Settings > Billing > Customer portal.`);
}

const secrets = {
  STRIPE_SECRET_KEY: KEY,
  ...(secret ? { STRIPE_WEBHOOK_SECRET: secret } : {}),
  ...priceIds,
  ...(portalId ? { STRIPE_PORTAL_CONFIGURATION: portalId } : {}),
  SITE_URL: site,
};
if (envFile) {
  // Used by the GitHub "Set up Stripe" workflow: write the values to a file, print only names.
  const { writeFileSync } = await import("node:fs");
  writeFileSync(envFile, Object.entries(secrets).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
  console.log(`\nDone. Saving ${Object.keys(secrets).join(", ")} on the AI server.`);
  if (!secret && old) console.log("The webhook already existed, so its signing secret wasn't changed.");
} else {
  console.log("\nDone. Now run this in your terminal (from the readily folder):\n");
  console.log(`npx supabase secrets set ${Object.entries(secrets).map(([k, v]) => `${k}=${v}`).join(" ")}\n`);
  if (!secret && !old) console.log("Note: no webhook secret was printed. Find it in Stripe > Developers > Webhooks.");
}
