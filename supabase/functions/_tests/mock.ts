// A pretend Supabase (database, storage, auth) and pretend AI providers, so the edge
// functions can be tested end to end without any network or real accounts.
export type Row = Record<string, unknown>;

export const state = {
  profiles: [] as Row[],
  ai_jobs: [] as Row[],
  tool_trials: [] as Row[],
  credit_events: [] as Row[],
  billing_events: [] as Row[],
  storage: new Map<string, Uint8Array>(),
  calls: [] as string[],
  replicateStatus: "processing" as string,
  replicateInputs: [] as Row[],
  anthropicBodies: [] as Row[],
  subscriptions: new Map<string, Row>(),
  rpcs: [] as { fn: string; args: Row }[],
  paddleBodies: [] as { path: string; body: Row }[],
};

export function reset() {
  state.profiles = [];
  state.ai_jobs = [];
  state.tool_trials = [];
  state.credit_events = [];
  state.billing_events = [];
  state.paddleBodies = [];
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
    case "apply_paddle_subscription": {
      // Mirrors public.apply_paddle_subscription in schema.sql.
      const active = ["active", "trialing", "past_due"].includes(String(a.p_status));
      const newPlan = active ? String(a.p_plan) : "free";
      if (p!.billing_event_at && String(a.p_event_at) < String(p!.billing_event_at)) return "stale";
      if (p!.paddle_subscription_id && p!.paddle_subscription_id !== a.p_subscription && ["active", "trialing", "past_due"].includes(String(p!.subscription_status)) && !active) return "other";
      const changed = p!.plan !== newPlan;
      const oldPlan = p!.plan;
      p!.plan = newPlan;
      p!.subscription_status = a.p_status;
      p!.paddle_subscription_id = a.p_subscription;
      p!.paddle_customer_id = a.p_customer ?? p!.paddle_customer_id;
      p!.cancel_at_period_end = a.p_cancel_at_end;
      p!.billing_interval = active ? a.p_interval : p!.billing_interval;
      p!.current_period_end = a.p_period_end;
      p!.billing_event_at = a.p_event_at;
      if (!active) {
        if (oldPlan !== "free") p!.credits = 0;
      } else if (a.p_status !== "past_due" && (a.p_new_period || oldPlan === "free")) p!.credits = PLAN_CREDITS[newPlan];
      else if (changed) {
        const left = p!.credits_refresh_at ? Math.max(0, Math.min(1, (Date.parse(String(p!.credits_refresh_at)) - Date.now()) / (30 * 86400e3))) : 1;
        const up = PLAN_CREDITS[newPlan] > PLAN_CREDITS[String(oldPlan)];
        p!.credits = up ? (p!.credits as number) + Math.round((PLAN_CREDITS[newPlan] - PLAN_CREDITS[String(oldPlan)]) * left) : Math.min(p!.credits as number, PLAN_CREDITS[newPlan]);
      }
      return "applied";
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
          return ok(JSON.stringify(rpc(rest[2], JSON.parse(await bodyText())) ?? null));
        } catch (e) {
          return ok({ message: (e as Error).message }, 400);
        }
      }
      const table = (state as unknown as Record<string, Row[]>)[rest[2]];
      if (!table) return ok({ message: "no table" }, 404);
      if (method === "GET") return ok(filter(table, url.searchParams));
      if (method === "POST") {
        const row = JSON.parse(await bodyText());
        if (rest[2] === "billing_events" && table.some((r) => r.id === row.id)) return ok({ message: "duplicate key" }, 409);
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
  if (url.host === "api.paddle.com" || url.host === "sandbox-api.paddle.com") {
    const auth = new Headers(init.headers).get("authorization") ?? "";
    if (!auth.startsWith("Bearer pdl_")) return ok({ error: { code: "authentication_missing", detail: "bad key" } }, 401);
    const body = method === "GET" ? {} : JSON.parse((await bodyText()) || "{}");
    state.paddleBodies.push({ path: url.pathname, body });
    const portal = url.pathname.match(/^\/customers\/(ctm_\w+)\/portal-sessions$/);
    if (portal && method === "POST") return ok({ data: { id: "cpls_1", customer_id: portal[1], urls: { general: { overview: `https://customer-portal.paddle.test/${portal[1]}?subs=${(body.subscription_ids ?? []).join(",")}` }, subscriptions: [] } } }, 201);
    const sub = url.pathname.match(/^\/subscriptions\/(sub_\w+)$/);
    if (sub && method === "PATCH") return ok({ data: { id: sub[1], status: "active", items: (body.items ?? []).map((i: Row) => ({ price: { id: i.price_id } })) } });
    if (sub) return state.subscriptions.has(sub[1]) ? ok({ data: state.subscriptions.get(sub[1]) }) : ok({ error: { code: "not_found", detail: "Subscription not found" } }, 404);
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
    PADDLE_API_KEY: "pdl_live_apikey_test",
    PADDLE_WEBHOOK_SECRET: "pdl_ntfset_secret",
    SITE_URL: "https://readily.test",
    PADDLE_PRICE_BASIC_MONTH: "pri_basic_m",
    PADDLE_PRICE_BASIC_YEAR: "pri_basic_y",
    PADDLE_PRICE_PRO_MONTH: "pri_pro_m",
    PADDLE_PRICE_PRO_YEAR: "pri_pro_y",
    PADDLE_PRICE_PREMIUM_MONTH: "pri_prem_m",
    PADDLE_PRICE_PREMIUM_YEAR: "pri_prem_y",
  })) Deno.env.set(k, v);
  globalThis.fetch = mockFetch as typeof fetch;
}
