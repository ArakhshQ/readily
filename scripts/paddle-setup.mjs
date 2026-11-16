// One-time Paddle setup for Readily. Creates the Basic, Pro and Premium products with
// monthly and yearly prices, and the notification destination (webhook) that tells
// Readily about payments. Safe to run again: anything that already exists is reused.
//
//   PADDLE_API_KEY=pdl_live_... node scripts/paddle-setup.mjs https://YOUR-PROJECT.supabase.co https://readilytools.com --save-to paddle.env
//
// Never prints secret values. With --save-to, writes them to a file for `supabase secrets set --env-file`.

const KEY = process.env.PADDLE_API_KEY ?? "";
const args = process.argv.slice(2);
const saveAt = args.indexOf("--save-to");
const envFile = saveAt >= 0 ? args[saveAt + 1] : null;
const [supabaseUrl, siteUrl] = args.filter((_, i) => saveAt < 0 || (i !== saveAt && i !== saveAt + 1));

if (!KEY || !supabaseUrl || !siteUrl) {
  console.error("Usage: PADDLE_API_KEY=pdl_... node scripts/paddle-setup.mjs https://YOUR-PROJECT.supabase.co https://your-site.com [--save-to paddle.env]");
  process.exit(1);
}
const sandbox = KEY.startsWith("pdl_sdbx_");
if (!sandbox && !KEY.startsWith("pdl_live_")) {
  console.error("That doesn't look like a Paddle API key. It should start with pdl_live_ (or pdl_sdbx_ for a test account).");
  process.exit(1);
}
const API = process.env.PADDLE_API_BASE ?? (sandbox ? "https://sandbox-api.paddle.com" : "https://api.paddle.com");

const PLANS = [
  { id: "basic", name: "Readily Basic", month: 499, year: 4900, description: "Pro-quality on-device tools, PDF to Word, searchable scans and 200 AI credits a month." },
  { id: "pro", name: "Readily Pro", month: 1199, year: 11900, description: "Studio voice, subtitles, translation, photo restoration and 700 AI credits a month." },
  { id: "premium", name: "Readily Premium", month: 2999, year: 29900, description: "Best-quality AI voice, dubbing, video and image AI and 2,000 AI credits a month." },
];
const EVENTS = [
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.canceled",
  "transaction.completed",
];

async function paddle(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", "Paddle-Version": "1" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.error?.detail ?? `HTTP ${res.status}`;
    const hint = res.status === 403 ? " (the API key is missing a permission; see docs/PADDLE.md)" : "";
    throw new Error(`${method} ${path}: ${detail}${hint}`);
  }
  return data;
}

async function listAll(path) {
  const out = [];
  let next = path;
  while (next) {
    const page = await paddle("GET", next);
    out.push(...(page.data ?? []));
    const n = page.meta?.pagination?.next;
    next = page.meta?.pagination?.has_more && n ? n.replace(API, "") : null;
  }
  return out;
}

console.log(`Setting up Paddle (${sandbox ? "TEST / sandbox" : "LIVE"})…\n`);

const products = await listAll("/products?status=active&per_page=200");
const secrets = {};
for (const plan of PLANS) {
  let product = products.find((p) => p.custom_data?.readily_plan === plan.id);
  if (!product) {
    product = (await paddle("POST", "/products", {
      name: plan.name,
      description: plan.description,
      tax_category: "standard",
      custom_data: { readily_plan: plan.id },
    })).data;
    console.log(`  created product ${plan.name}`);
  } else {
    console.log(`  found product ${plan.name}`);
  }
  const prices = await listAll(`/prices?product_id=${product.id}&status=active&per_page=200`);
  for (const interval of ["month", "year"]) {
    const amount = String(plan[interval]);
    let price = prices.find(
      (p) => p.custom_data?.readily_interval === interval && p.unit_price?.amount === amount && p.unit_price?.currency_code === "USD" && p.billing_cycle?.interval === interval,
    );
    if (!price) {
      price = (await paddle("POST", "/prices", {
        product_id: product.id,
        description: `${plan.name}, billed ${interval === "year" ? "yearly" : "monthly"}`,
        name: `${plan.name.replace("Readily ", "")} (${interval === "year" ? "yearly" : "monthly"})`,
        unit_price: { amount, currency_code: "USD" },
        billing_cycle: { interval, frequency: 1 },
        tax_mode: "account_setting",
        custom_data: { readily_plan: plan.id, readily_interval: interval },
      })).data;
      console.log(`    created price $${(plan[interval] / 100).toFixed(2)}/${interval}`);
    } else {
      console.log(`    found price $${(plan[interval] / 100).toFixed(2)}/${interval}`);
    }
    secrets[`PADDLE_PRICE_${plan.id.toUpperCase()}_${interval.toUpperCase()}`] = price.id;
  }
}

// Notification destination: Paddle only shows the signing secret through the API.
const hookUrl = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/paddle-webhook`;
const settings = await listAll("/notification-settings");
let hook = settings.find((s) => s.destination === hookUrl && s.type === "url");
if (hook) {
  hook = (await paddle("PATCH", `/notification-settings/${hook.id}`, { subscribed_events: EVENTS, active: true })).data;
  console.log(`\n  webhook already exists, events updated`);
} else {
  hook = (await paddle("POST", "/notification-settings", {
    description: "Readily plans",
    type: "url",
    destination: hookUrl,
    subscribed_events: EVENTS,
    api_version: 1,
    traffic_source: "platform",
  })).data;
  console.log(`\n  created webhook ${hookUrl}`);
}
if (!hook.endpoint_secret_key) {
  console.error("Paddle didn't return the webhook's secret key. Open Paddle > Developer tools > Notifications, copy the secret, and save it as PADDLE_WEBHOOK_SECRET.");
} else {
  secrets.PADDLE_WEBHOOK_SECRET = hook.endpoint_secret_key;
}

secrets.PADDLE_API_KEY = KEY;
secrets.SITE_URL = siteUrl.replace(/\/+$/, "");

if (envFile) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(envFile, Object.entries(secrets).map(([k, v]) => `${k}=${v}`).join("\n") + "\n", { mode: 0o600 });
  console.log(`\nDone. Saving on the server: ${Object.keys(secrets).join(", ")}`);
} else {
  console.log("\nDone. Price IDs (these are not secret):");
  for (const [k, v] of Object.entries(secrets)) if (k.startsWith("PADDLE_PRICE_")) console.log(`  ${k}=${v}`);
  console.log("Save PADDLE_API_KEY and PADDLE_WEBHOOK_SECRET with --save-to and `supabase secrets set --env-file`.");
}
