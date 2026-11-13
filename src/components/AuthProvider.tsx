"use client";

// Signed-in state for the whole site. Supabase is loaded lazily, so visitors who
// never sign in don't download it until it's needed.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { accountsEnabled, getSupabase, onSupabaseReady } from "@/lib/supabase";

interface AuthState {
  enabled: boolean;
  /** True until the stored session has been checked. */
  loading: boolean;
  session: Session | null;
  /** Set when the visitor arrived from a password-reset email. */
  recovering: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>({ enabled: false, loading: false, session: null, recovering: false, signOut: async () => {} });

export function useAuth() {
  return useContext(Ctx);
}

/** True if this browser has a stored session, without loading Supabase. */
function hasStoredSession(): boolean {
  try {
    return !!localStorage.getItem("readily-auth") || /access_token|error_description/.test(window.location.hash);
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(accountsEnabled);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!accountsEnabled) return;
    let cancelled = false;
    let unsub: (() => void) | undefined;
    const attach = (c: Promise<SupabaseClient>) =>
      c
        .then(async (sb) => {
          if (cancelled || unsub) return;
          // Listen first, so a sign-in that happens right now is never missed.
          const sub = sb.auth.onAuthStateChange((event, s) => {
            setSession(s);
            setLoading(false);
            if (event === "PASSWORD_RECOVERY") setRecovering(true);
          });
          unsub = () => sub.data.subscription.unsubscribe();
          const { data } = await sb.auth.getSession();
          if (!cancelled) {
            setSession(data.session);
            setLoading(false);
          }
        })
        .catch(() => setLoading(false));

    const path = window.location.pathname;
    const accountPage = /^\/(login|signup|dashboard|forgot-password|reset-password|billing|admin)\/?/.test(path) || /access_token=/.test(window.location.hash);
    if (!hasStoredSession() && !accountPage) {
      // Most visitors never sign in: don't load Supabase until something on the page needs it,
      // but start following the sign-in state the moment it does (for example on the login page).
      setLoading(false);
      const off = onSupabaseReady(attach);
      return () => {
        cancelled = true;
        off();
        unsub?.();
      };
    }
    attach(getSupabase());
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const signOut = useCallback(async () => {
    const sb = await getSupabase();
    await sb.auth.signOut();
    setSession(null);
  }, []);

  return <Ctx.Provider value={{ enabled: accountsEnabled, loading, session, recovering, signOut }}>{children}</Ctx.Provider>;
}
