"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import { Message } from "../Message";
import { AuthShell, NotReady } from "./AuthShell";
import { PasswordField } from "./PasswordField";
import { friendlyAuthError, getSupabase } from "@/lib/supabase";

function safeNext(n: string | null): string {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard/";
}

export function LoginForm() {
  const { enabled, session } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (session) router.replace(next);
  }, [session, router, next]);

  if (!enabled) return <NotReady />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setUnconfirmed(false);
    try {
      const sb = await getSupabase();
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      // The sign-in state updates on its own; the effect above then moves on to `next`.
    } catch (x) {
      const msg = friendlyAuthError(x);
      setUnconfirmed(msg.startsWith("Confirm your email"));
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      const sb = await getSupabase();
      const { error } = await sb.auth.resend({ type: "signup", email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/dashboard/?welcome=1` } });
      if (error) throw error;
      setResent(true);
    } catch (x) {
      setError(friendlyAuthError(x));
    }
  }

  return (
    <AuthShell title="Log in" intro="Welcome back. Your history and saved files are waiting.">
      <form className="auth-stack" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <p className="fine" style={{ marginTop: -8 }}>
          <Link href="/forgot-password/">Forgot your password?</Link>
        </p>
        {error && <Message kind="error">{error}</Message>}
        {unconfirmed && (
          <button type="button" className="btn btn-secondary" onClick={resend} disabled={resent}>
            {resent ? "Confirmation email sent" : "Send the confirmation email again"}
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email || !password}>
          {busy ? "Logging in" : "Log in"}
        </button>
        <p className="auth-switch">
          New to Readily? <Link href="/signup/">Create a free account</Link>
        </p>
      </form>
    </AuthShell>
  );
}
