"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthProvider";
import { Message } from "../Message";
import { AuthShell, NotReady } from "./AuthShell";
import { PasswordField } from "./PasswordField";
import { PLAN_BY_ID, toPaidPlanId } from "@/lib/plans";
import { friendlyAuthError, getSupabase } from "@/lib/supabase";

export function SignupForm() {
  const { enabled, session } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const planParam = params.get("plan");
  const plan = toPaidPlanId(planParam);
  const interval = params.get("interval") === "year" ? "year" : "month";
  // Where to land after confirming the email: the tool they came from, or the dashboard.
  const nextParam = params.get("next");
  const nextPath = nextParam && /^\/[a-z0-9-]+\/$/.test(nextParam) ? nextParam : null;
  const landing = () =>
    `${window.location.origin}${nextPath ?? "/dashboard/"}?welcome=1${plan ? `&checkout=${plan}&interval=${interval}` : ""}`;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (session) router.replace("/dashboard/");
  }, [session, router]);

  if (!enabled) return <NotReady />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8 || !/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
      setError("Choose a password with at least 8 characters, mixing letters and numbers.");
      return;
    }
    setBusy(true);
    try {
      const sb = await getSupabase();
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: landing(),
          data: { full_name: name.trim() || null, plan_interest: plan },
        },
      });
      if (error) throw error;
      // Supabase returns a user with no identities when the email is already registered.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        throw new Error("user_already_exists");
      }
      if (data.session) router.replace("/dashboard/?welcome=1");
      else setSentTo(email.trim());
    } catch (x) {
      setError(friendlyAuthError(x));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!sentTo) return;
    try {
      const sb = await getSupabase();
      const { error } = await sb.auth.resend({ type: "signup", email: sentTo, options: { emailRedirectTo: landing() } });
      if (error) throw error;
      setResent(true);
    } catch (x) {
      setError(friendlyAuthError(x));
    }
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your email" intro={<>We sent a link to <strong>{sentTo}</strong>. Open it to confirm your account and go straight to your dashboard.</>}>
        <div className="auth-stack">
          <p className="hint">Not there after a minute? Check your spam or promotions folder.</p>
          {error && <Message kind="error">{error}</Message>}
          <button type="button" className="btn btn-secondary" onClick={resend} disabled={resent}>
            {resent ? "Email sent again" : "Send the email again"}
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setSentTo(null)}>
            Use a different email
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your free account"
      intro={
        plan ? (
          <>
            You&apos;ll join the <strong>{PLAN_BY_ID[plan].name}</strong> waitlist. We&apos;ll email you when it opens; until then everything free keeps working.
          </>
        ) : (
          "Free forever. No card needed."
        )
      }
    >
      <form className="auth-stack" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="name">
            Name <span className="optional">(optional)</span>
          </label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" />
        </div>
        <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 8 characters, with letters and numbers." />
        {error && <Message kind="error">{error}</Message>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email || !password}>
          {busy ? "Creating your account" : "Create account"}
        </button>
        <p className="fine">
          By signing up you agree to the <Link href="/terms/">terms</Link> and <Link href="/privacy/">privacy policy</Link>.
        </p>
        <p className="auth-switch">
          Already have an account? <Link href="/login/">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
