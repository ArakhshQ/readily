// Minimal Supabase client for edge functions: the service role talks to the database
// (PostgREST), storage and auth over plain HTTP, so there are no extra dependencies.
import { HttpError, env } from "./http.ts";

const base = () => env("SUPABASE_URL").replace(/\/+$/, "");
const key = () => env("SUPABASE_SERVICE_ROLE_KEY");
const headers = (extra: Record<string, string> = {}) => ({ apikey: key(), Authorization: `Bearer ${key()}`, ...extra });

async function check(res: Response, what: string) {
  if (res.ok) return res;
  const text = await res.text().catch(() => "");
  throw new HttpError(res.status === 404 ? 404 : 502, `${what} failed: ${text.slice(0, 300)}`);
}

/** The signed-in user behind a request's bearer token. */
export async function userFromRequest(req: Request): Promise<{ id: string; email?: string }> {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) throw new HttpError(401, "Log in to use this.");
  const res = await fetch(`${base()}/auth/v1/user`, { headers: { apikey: key(), Authorization: auth } });
  if (!res.ok) throw new HttpError(401, "Your session has expired. Log in again.");
  const u = await res.json();
  if (!u?.id) throw new HttpError(401, "Log in to use this.");
  return { id: u.id, email: u.email };
}

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${base()}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = String(body?.message ?? "");
    if (msg.includes("not enough credits")) throw new HttpError(402, "You don't have enough credits for this. Credits refresh monthly, or upgrade your plan.");
    throw new HttpError(502, `Database call ${fn} failed: ${msg || res.status}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export async function select<T>(table: string, query: string): Promise<T[]> {
  const res = await check(await fetch(`${base()}/rest/v1/${table}?${query}`, { headers: headers() }), `Reading ${table}`);
  return (await res.json()) as T[];
}

export async function insert<T>(table: string, row: Record<string, unknown>): Promise<T> {
  const res = await check(
    await fetch(`${base()}/rest/v1/${table}`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify(row),
    }),
    `Saving to ${table}`,
  );
  return ((await res.json()) as T[])[0];
}

export async function update(table: string, query: string, fields: Record<string, unknown>): Promise<void> {
  await check(
    await fetch(`${base()}/rest/v1/${table}?${query}`, {
      method: "PATCH",
      headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify(fields),
    }),
    `Updating ${table}`,
  );
}

export async function remove(table: string, query: string): Promise<void> {
  await check(await fetch(`${base()}/rest/v1/${table}?${query}`, { method: "DELETE", headers: headers() }), `Deleting from ${table}`);
}

// ---------------------------------------------------------------- storage

export async function download(bucket: string, path: string): Promise<Uint8Array> {
  const res = await check(await fetch(`${base()}/storage/v1/object/${bucket}/${path}`, { headers: headers() }), "Reading the uploaded file");
  return new Uint8Array(await res.arrayBuffer());
}

export async function upload(bucket: string, path: string, body: BodyInit, contentType: string): Promise<void> {
  await check(
    await fetch(`${base()}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: headers({ "Content-Type": contentType, "x-upsert": "true" }),
      body,
      // Required by fetch when streaming a request body.
      ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
    } as RequestInit),
    "Saving the result",
  );
}

export async function signedUrl(bucket: string, path: string, seconds: number, downloadName?: string): Promise<string> {
  const res = await check(
    await fetch(`${base()}/storage/v1/object/sign/${bucket}/${path}`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn: seconds }),
    }),
    "Creating a download link",
  );
  const { signedURL } = await res.json();
  const url = `${base()}/storage/v1${signedURL}`;
  return downloadName ? `${url}&download=${encodeURIComponent(downloadName)}` : url;
}

export async function removeObjects(bucket: string, paths: string[]): Promise<void> {
  if (!paths.length) return;
  await fetch(`${base()}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: paths }),
  }).catch(() => {});
}

export async function listObjects(bucket: string, prefix: string): Promise<{ name: string; created_at: string }[]> {
  const res = await fetch(`${base()}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefix, limit: 200, sortBy: { column: "created_at", order: "asc" } }),
  });
  if (!res.ok) return [];
  return await res.json();
}
