// Supabase connection. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// on Render to turn accounts on. Without them the site works and account pages
// explain that sign-up is opening soon.
import type { SupabaseClient } from "@supabase/supabase-js";

/** Keeps only https://<project>.supabase.co, even if a longer address was pasted
 *  (for example the ".../rest/v1/" API URL), which would otherwise break sign-up. */
function projectUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  try {
    return new URL(s).origin;
  } catch {
    return s;
  }
}

const URL_ = projectUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
const KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

export const accountsEnabled = Boolean(URL_ && KEY);

let client: Promise<SupabaseClient> | null = null;

/** Loads the Supabase library only when an account feature is used. */
export function getSupabase(): Promise<SupabaseClient> {
  if (!accountsEnabled) return Promise.reject(new Error("Accounts aren't set up yet."));
  if (!client) {
    client = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(URL_, KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // Implicit flow lets an email link work even when opened on another device.
          flowType: "implicit",
          storageKey: "readily-auth",
        },
      }),
    );
  }
  return client;
}

/** Turns Supabase's technical errors into plain sentences. */
export function friendlyAuthError(e: unknown): string {
  const raw = (e as { message?: string; code?: string })?.message || String(e);
  const code = (e as { code?: string })?.code || "";
  const m = `${code} ${raw}`.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid_credentials")) return "That email and password don't match. Check them and try again.";
  if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) return "Confirm your email first. Check your inbox for the link we sent.";
  if (m.includes("already registered") || m.includes("user_already_exists")) return "There's already an account with this email. Log in instead.";
  if (m.includes("password should be") || m.includes("weak_password")) return "Choose a longer password: at least 8 characters, mixing letters and numbers.";
  if (m.includes("rate limit") || m.includes("over_email_send_rate_limit") || m.includes("too many")) return "Too many attempts. Wait a minute, then try again.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Couldn't reach Readily's servers. Check your connection and try again.";
  if (m.includes("same_password") || m.includes("different from the old")) return "Your new password must be different from the old one.";
  if (m.includes("expired") || m.includes("otp_expired")) return "This link has expired. Request a new one.";
  return raw.length < 160 ? raw : "Something went wrong. Please try again.";
}
