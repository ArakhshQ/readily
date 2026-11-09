// A pretend Supabase (database, storage, auth) and pretend AI providers, so the edge
// functions can be tested end to end without any network or real accounts.
export type Row = Record<string, unknown>;

export const state = {
  profiles: [] as Row[],
  ai_jobs: [] as Row[],
  tool_trials: [] as Row[],
  credit_events: [] as Row[],
  stripe_events: [] as Row[],
  storage: new Map<string, Uint8Array>(),
  calls: [] as string[],
  replicateStatus: "processing" as string,
  replicateInputs: [] as Row[],
  anthropicBodies: [] as Row[],
  subscriptions: new Map<string, Row>(),
  rpcs: [] as { fn: string; args: Row }[],
};

export function reset() {
  state.profiles = [];
  state.ai_jobs = [];
  state.tool_trials = [];
  state.credit_events = [];
  state.stripe_events = [];
  state.storage.clear();
  state.calls = [];
  state.replicateStatus = "processing";
  state.replicateInputs = [];
  state.anthropicBodies = [];
  state.subscriptions.clear();
  state.rpcs = [];
}

function filter(rows: Row[], params: URLSearchParams) {
  let out = rows;
  for (const [k, v] of params) {
    if (["select", "limit", "order"].includes(k)) continue;
    out = out.filter((r) => {
      const val = r[k];
      if (v.startsWith("eq.")) return String(val) === decodeURIComponent(v.slice(3));
      if (v.startsWith("gt.")) return String(val) > v.slice(3);
      if (v.startsWith("gte.")) return String(val) >= v.slice(4);
      if (v.startsWith("lt.")) return String(val) < v.slice(3);
      if (v === "not.is.null") return val !== null && val !== undefined;
      if (v.startsWith("in.(")) return v.slice(4, -1).split(",").includes(String(val));
      throw new Error(`mock: unsupported filter ${k}=${v}`);
    });
  }
  const limit = params.get("limit");
  return limit ? out.slice(0, Number(limit)) : out;
}

const PLAN_CREDITS: Record<string, number> = { free: 0, basic: 200, pro: 700, premium: 2000 };

function rpc(fn: string, a: Row): unknown {
  state.rpcs.push({ fn, args: a });
  const p = state.profiles.find((x) => x.id === a.p_user);
  switch (fn) {
    case "claim_trial": {
      if (state.tool_trials.some((t) => t.user_id === a.p_user && t.tool === a.p_tool)) return false;
      state.tool_trials.push({ user_id: a.p_user, tool: a.p_tool });
      return true;
    }
    case "spend_credits": {
      if (!p || (p.credits as number) < (a.p_amount as number)) throw Object.assign(new Error("not enough credits"), { pg: true });
      p.credits = (p.credits as number) - (a.p_amount as number);
      state.credit_events.push({ user_id: a.p_user, delta: -(a.p_amount as number), reason: a.p_reason });
      return p.credits;
    }
    case "refund_credits": {
      p!.credits = (p!.credits as number) + (a.p_amount as number);
      state.credit_events.push({ user_id: a.p_user, delta: a.p_amount, reason: a.p_reason });
      return p!.credits;
    }
    case "set_subscription": {
      const active = ["active", "trialing"].includes(String(a.p_status));
      const newPlan = active ? String(a.p_plan) : "free";
      const changed = p!.plan !== newPlan;
      p!.plan = newPlan;
      p!.subscription_status = a.p_status;
      p!.stripe_subscription_id = a.p_subscription;
      p!.stripe_customer_id = a.p_customer ?? p!.stripe_customer_id;
      p!.cancel_at_period_end = a.p_cancel_at_end;
      if (!active) p!.credits = 0;
      else if (a.p_new_period || changed) p!.credits = PLAN_CREDITS[newPlan];
      return null;
    }
  }
  throw new Error(`mock: unknown rpc ${fn}`);
}

const ok = (body: unknown, status = 200, headers: Record<string, string> = { "content-type": "application/json" }) =>
  new Response(typeof body === "string" || body instanceof Uint8Array ? (body as BodyInit) : JSON.stringify(body), { status, headers });

export async function mockFetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = (init.method ?? "GET").toUpperCase();
  state.calls.push(`${method} ${url.host}${url.pathname}`);
  const bodyText = async () => (typeof init.body === "string" ? init.body : init.body ? await new Response(init.body as BodyInit).text() : "");

  // ---------------- Supabase
  if (url.host === "sb.test") {
    if (url.pathname === "/auth/v1/user") {
      const auth = new Headers(init.headers).get("authorization") ?? "";
      const id = auth.replace(/^Bearer /i, "");
      return id.startsWith("user-") ? ok({ id, email: `${id}@example.com` }) : ok({ msg: "bad jwt" }, 401);
    }
    const rest = url.pathname.match(/^\/rest\/v1\/(rpc\/)?(\w+)$/);
    if (rest) {
      if (rest[1]) {
        try {
          return ok(rpc(rest[2], JSON.parse(await bodyText())));
        } catch (e) {
          return ok({ message: (e as Error).message }, 400);
        }
      }
      const table = (state as unknown as Record<string, Row[]>)[rest[2]];
      if (!table) return ok({ message: "no table" }, 404);
      if (method === "GET") return ok(filter(table, url.searchParams));
      if (method === "POST") {
        const row = JSON.parse(await bodyText());
        if (rest[2] === "stripe_events" && table.some((r) => r.id === row.id)) return ok({ message: "duplicate key" }, 409);
        const full = { id: row.id ?? crypto.randomUUID(), created_at: new Date().toISOString(), output: null, output_path: null, ...row };
        table.push(full);
        return ok([full], 201);
      }
      if (method === "PATCH") {
        const fields = JSON.parse(await bodyText());
        for (const r of filter(table, url.searchParams)) Object.assign(r, fields);
        return new Response(null, { status: 204 });
      }
      if (method === "DELETE") {
        const gone = new Set(filter(table, url.searchParams));
        (state as unknown as Record<string, Row[]>)[rest[2]] = table.filter((r) => !gone.has(r));
        return new Response(null, { status: 204 });
      }
    }
    const sign = url.pathname.match(/^\/storage\/v1\/object\/sign\/([\w-]+)\/(.+)$/);
    if (sign) return ok({ signedURL: `/object/sign/${sign[1]}/${sign[2]}?token=t` });
    if (url.pathname.startsWith("/storage/v1/object/list/")) return ok([]);
    const obj = url.pathname.match(/^\/storage\/v1\/object\/([\w-]+)\/(.+)$/);
    if (obj) {
      const key = `${obj[1]}/${decodeURIComponent(obj[2])}`;
      if (method === "GET") return state.storage.has(key) ? ok(state.storage.get(key)!, 200, { "content-type": "application/octet-stream" }) : ok({ error: "not found" }, 404);
      if (method === "POST") {
        state.storage.set(key, new Uint8Array(await new Response(init.body as BodyInit).arrayBuffer()));
        return ok({ Key: key });
      }
    }
    const bulk = url.pathname.match(/^\/storage\/v1\/object\/([\w-]+)$/);
    if (bulk && method === "DELETE") {
      for (const p of JSON.parse(await bodyText()).prefixes) state.storage.delete(`${bulk[1]}/${p}`);
      return ok([]);
    }
  }

  // ---------------- AI providers
  if (url.host === "api.anthropic.com") {
    const body = JSON.parse(await bodyText());
    state.anthropicBodies.push(body);
    const sys = String(body.system);
    const text = sys.includes("turn a user's plain-words request")
      ? JSON.stringify({ steps: [{ op: "images_to_pdf", page: "a4" }, { op: "pdf_under_size", target_kb: 2000 }], reply: "I'll combine your scans and keep it under 2 MB." })
      : sys.includes("translator")
        ? "Translated text"
        : "A short summary.";
    return ok({ content: [{ type: "text", text }] });
  }
  if (url.host === "api.elevenlabs.io") {
    if (url.pathname === "/v1/speech-to-text") {
      return ok({ language_code: "en", text: "Hello world.", words: [{ text: "Hello", start: 0.1, end: 0.5, type: "word", speaker_id: "s0" }, { text: " ", start: 0.5, end: 0.6, type: "spacing" }, { text: "world.", start: 0.6, end: 1.0, type: "word", speaker_id: "s0" }] });
    }
    if (url.pathname === "/v1/audio-isolation" || url.pathname.startsWith("/v1/speech-to-speech/") || url.pathname.startsWith("/v1/text-to-speech/")) {
      return ok(new Uint8Array([0xff, 0xfb, 1, 2, 3]), 200, { "content-type": "audio/mpeg" });
    }
    if (url.pathname === "/v1/voices") return ok({ voices: [{ voice_id: "v1", name: "Ana", labels: { gender: "female", accent: "british" }, category: "premade" }, { voice_id: "v2", name: "Mine", category: "cloned" }] });
    if (url.pathname === "/v1/dubbing" && method === "POST") return ok({ dubbing_id: "dub_1", expected_duration_sec: 30 });
    if (url.pathname === "/v1/dubbing/dub_1") return ok({ status: "dubbed" });
    if (url.pathname === "/v1/dubbing/dub_1/audio/es") return ok(new Uint8Array([1, 2, 3, 4]), 200, { "content-type": "audio/mpeg" });
  }
  if (url.host === "api.replicate.com") {
    if (url.pathname.startsWith("/v1/models/")) return ok({ latest_version: url.pathname.includes("google/") ? null : { id: "abc123" } });
    if (url.pathname === "/v1/predictions" && method === "POST") {
      state.replicateInputs.push(JSON.parse(await bodyText()));
      return ok({ id: "pred_1", status: "starting" }, 201);
    }
    if (url.pathname === "/v1/predictions/pred_1") {
      return ok({ id: "pred_1", status: state.replicateStatus, output: state.replicateStatus === "succeeded" ? ["https://replicate.delivery/a.wav", "https://replicate.delivery/out.png"] : null, error: state.replicateStatus === "failed" ? "CUDA out of memory" : null });
    }
  }
  if (url.host === "replicate.delivery") return ok(new Uint8Array([137, 80, 78, 71]), 200, { "content-type": "image/png" });
  if (url.host === "api.stripe.com") {
    const body = new URLSearchParams(await bodyText());
    if (url.pathname === "/v1/customers") return ok({ id: "cus_new" });
    if (url.pathname === "/v1/checkout/sessions") return ok({ url: `https://checkout.stripe.test/s?price=${body.get("line_items[0][price]")}&user=${body.get("client_reference_id")}` });
    if (url.pathname === "/v1/billing_portal/sessions") return ok({ url: `https://billing.stripe.test/p?flow=${body.get("flow_data[type]") ?? "none"}` });
    const sub = url.pathname.match(/^\/v1\/subscriptions\/(\w+)$/);
    if (sub) return ok(state.subscriptions.get(sub[1]) ?? {});
  }
  throw new Error(`mock: unexpected request ${method} ${url.href}`);
}

/** Loads an edge function and returns its request handler (Deno.serve is captured). */
export async function loadFunction(path: string): Promise<(req: Request) => Promise<Response>> {
  let handler: ((req: Request) => Promise<Response>) | null = null;
  const real = Deno.serve;
  (Deno as unknown as { serve: unknown }).serve = (h: (req: Request) => Promise<Response>) => {
    handler = h;
    return {} as unknown;
  };
  try {
    await import(path);
  } finally {
    (Deno as unknown as { serve: unknown }).serve = real;
  }
  if (!handler) throw new Error("no handler");
  return handler;
}

export function setEnv() {
  for (const [k, v] of Object.entries({
    SUPABASE_URL: "https://sb.test",
    SUPABASE_SERVICE_ROLE_KEY: "svc",
    ANTHROPIC_API_KEY: "a",
    ELEVENLABS_API_KEY: "e",
    REPLICATE_API_TOKEN: "r",
    STRIPE_SECRET_KEY: "sk_test",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    SITE_URL: "https://readily.test",
    STRIPE_PRICE_BASIC_MONTH: "price_basic_m",
    STRIPE_PRICE_PRO_MONTH: "price_pro_m",
    STRIPE_PRICE_PRO_YEAR: "price_pro_y",
    STRIPE_PRICE_PREMIUM_MONTH: "price_prem_m",
  })) Deno.env.set(k, v);
  globalThis.fetch = mockFetch as typeof fetch;
}
