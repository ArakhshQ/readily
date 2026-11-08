// Everything a signed-in user's dashboard reads and writes. Row-level security in
// the database (supabase/schema.sql) ensures each user can only touch their own rows.
import { getSupabase } from "./supabase";
import { PLAN_BY_ID, type PlanId } from "./plans";

export const BUCKET = "user-files";

export interface Profile {
  id: string;
  full_name: string | null;
  plan: PlanId;
  plan_interest: Exclude<PlanId, "free"> | null;
  created_at: string;
}

export interface HistoryItem {
  id: number;
  tool: string;
  files: { name: string; size: number }[];
  created_at: string;
}

export interface SavedFile {
  id: string;
  name: string;
  size: number;
  mime: string | null;
  path: string;
  tool: string | null;
  created_at: string;
}

async function userId(): Promise<string> {
  const sb = await getSupabase();
  const { data } = await sb.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Log in to use your dashboard.");
  return id;
}

export async function getProfile(): Promise<Profile | null> {
  const sb = await getSupabase();
  const id = await userId();
  const { data, error } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(fields: Partial<Pick<Profile, "full_name" | "plan_interest">>): Promise<void> {
  const sb = await getSupabase();
  const id = await userId();
  const { error } = await sb.from("profiles").update(fields).eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------- history

export async function addHistory(tool: string, files: { name: string; size: number }[]): Promise<void> {
  const sb = await getSupabase();
  await userId();
  const { error } = await sb.from("history").insert({ tool, files });
  if (error) throw error;
}

export async function listHistory(days: number): Promise<HistoryItem[]> {
  const sb = await getSupabase();
  await userId();
  let q = sb.from("history").select("id, tool, files, created_at").order("created_at", { ascending: false }).limit(200);
  if (days > 0) q = q.gte("created_at", new Date(Date.now() - days * 86400_000).toISOString());
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as HistoryItem[];
}

export async function clearHistory(): Promise<void> {
  const sb = await getSupabase();
  const id = await userId();
  const { error } = await sb.from("history").delete().eq("user_id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------- saved files

export async function listFiles(): Promise<SavedFile[]> {
  const sb = await getSupabase();
  await userId();
  const { data, error } = await sb.from("files").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedFile[];
}

export function storageUsed(files: SavedFile[]): number {
  return files.reduce((s, f) => s + Number(f.size || 0), 0);
}

export function storageLimit(plan: PlanId): number {
  return PLAN_BY_ID[plan]?.storageBytes ?? PLAN_BY_ID.free.storageBytes;
}

/** Largest single file the free storage tier accepts. */
export const MAX_SAVE_BYTES = 50 * 1024 * 1024;

export async function saveFile(blob: Blob, name: string, tool: string): Promise<SavedFile> {
  const sb = await getSupabase();
  const id = await userId();
  if (blob.size > MAX_SAVE_BYTES) throw new Error("Files over 50 MB can't be saved yet. Download it instead.");
  const safe = name.replace(/[^\w.\- ()]+/g, "_").slice(-120);
  const path = `${id}/${crypto.randomUUID()}-${safe}`;
  const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || "application/octet-stream", upsert: false });
  if (up.error) throw new Error(up.error.message.includes("exceeded") ? "Your storage is full. Delete some saved files first." : up.error.message);
  const { data, error } = await sb.from("files").insert({ name, size: blob.size, mime: blob.type || null, path, tool }).select().single();
  if (error) {
    await sb.storage.from(BUCKET).remove([path]);
    throw new Error(/quota|storage limit/i.test(error.message) ? "Your storage is full. Delete some saved files or upgrade." : error.message);
  }
  return data as SavedFile;
}

export async function downloadUrl(file: SavedFile): Promise<string> {
  const sb = await getSupabase();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(file.path, 120, { download: file.name });
  if (error || !data) throw error ?? new Error("Couldn't create a download link.");
  return data.signedUrl;
}

export async function deleteFile(file: SavedFile): Promise<void> {
  const sb = await getSupabase();
  const rm = await sb.storage.from(BUCKET).remove([file.path]);
  if (rm.error) throw rm.error;
  const { error } = await sb.from("files").delete().eq("id", file.id);
  if (error) throw error;
}

/** Deletes every saved file, then the account itself (history and profile go with it). */
export async function deleteAccount(): Promise<void> {
  const sb = await getSupabase();
  const files = await listFiles();
  for (let i = 0; i < files.length; i += 100) {
    const batch = files.slice(i, i + 100).map((f) => f.path);
    const rm = await sb.storage.from(BUCKET).remove(batch);
    if (rm.error) throw rm.error;
  }
  const { error } = await sb.rpc("delete_my_account");
  if (error) throw error;
  await sb.auth.signOut();
}
