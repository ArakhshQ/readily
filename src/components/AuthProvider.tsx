"use client";

// Signed-in state for the whole site. Supabase is loaded lazily, so visitors who
// never sign in don't download it until it's needed.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { accountsEnabled, getSupabase } from "@/lib/supabase";

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
    const path = window.location.pathname;
    const accountPage = /^\/(login|signup|dashboard|forgot-password|reset-password|billing|admin)\/?/.test(path) || /access_token=/.test(window.location.hash);
    // Most visitors never sign in: skip loading Supabase unless it's needed.
    if (!hasStoredSession() && !accountPage) {
      setLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
    getSupabase()
      .then(async (sb) => {
        const { data } = await sb.auth.getSession();
        setSession(data.session);
        setLoading(false);
        const sub = sb.auth.onAuthStateChange((event, s) => {
          setSession(s);
          if (event === "PASSWORD_RECOVERY") setRecovering(true);
        });
        unsub = () => sub.data.subscription.unsubscribe();
      })
      .catch(() => setLoading(false));
    return () => unsub?.();
  }, []);

  const signOut = useCallback(async () => {
    const sb = await getSupabase();
    await sb.auth.signOut();
    setSession(null);
  }, []);

  return <Ctx.Provider value={{ enabled: accountsEnabled, loading, session, recovering, signOut }}>{children}</Ctx.Provider>;
}
