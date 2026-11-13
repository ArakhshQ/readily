// Health check for uptime monitors: GET https://<project>.supabase.co/functions/v1/health
// Answers 200 "ok" when the server and the database both respond, 503 otherwise.
// Needs no login and reveals nothing; a regular ping also keeps a free project from pausing.
import * as db from "../_shared/db.ts";

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Use GET", { status: 405 });
  const started = Date.now();
  try {
    await db.select("daily_stats", "select=day&limit=1");
    return new Response(`ok ${Date.now() - started}ms\n`, { status: 200, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("health", e);
    return new Response("database unreachable\n", { status: 503, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
  }
});
