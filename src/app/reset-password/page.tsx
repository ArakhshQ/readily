"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AuthShell, NotReady } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";
import { Message } from "@/components/Message";
import { friendlyAuthError, getSupabase } from "@/lib/supabase";

export default function ResetPassword() {
  const { enabled, loading, session } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) return <NotReady />;
  if (loading) return <AuthShell aside={false} title="Checking your link" intro="One moment…" children={null} />;
  if (!session) {
    return (
      <AuthShell aside={false} title="This link has expired" intro="Password reset links work once and expire after an hour. Request a new one.">
        <Link href="/forgot-password/" className="btn btn-primary">
          Get a new link
        </Link>
      </AuthShell>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const sb = await getSupabase();
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
      router.replace("/dashboard/?password=updated");
    } catch (x) {
      setError(friendlyAuthError(x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell aside={false} title="Choose a new password" intro={`For ${session.user.email}`}>
      <form className="auth-stack" onSubmit={submit} noValidate>
        <PasswordField id="newpw" label="New password" value={password} onChange={setPassword} autoComplete="new-password" hint="At least 8 characters." />
        {error && <Message kind="error">{error}</Message>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !password}>
          {busy ? "Saving" : "Save new password"}
        </button>
      </form>
    </AuthShell>
  );
}
