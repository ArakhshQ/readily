"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AuthShell, NotReady } from "@/components/auth/AuthShell";
import { Message } from "@/components/Message";
import { friendlyAuthError, getSupabase } from "@/lib/supabase";

export default function ForgotPassword() {
  const { enabled } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return <NotReady />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const sb = await getSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password/` });
      if (error) throw error;
      setSent(true);
    } catch (x) {
      setError(friendlyAuthError(x));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell aside={false} title="Check your email" intro={<>If an account exists for <strong>{email.trim()}</strong>, we&apos;ve sent a link to choose a new password.</>}>
        <Link href="/login/" className="btn btn-secondary">
          Back to log in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell aside={false} title="Reset your password" intro="Enter the email you signed up with and we'll send you a link to choose a new password.">
      <form className="auth-stack" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        {error && <Message kind="error">{error}</Message>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email}>
          {busy ? "Sending" : "Send reset link"}
        </button>
        <p className="auth-switch">
          Remembered it? <Link href="/login/">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
