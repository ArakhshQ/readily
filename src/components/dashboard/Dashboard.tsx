"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../AuthProvider";
import { NotReady } from "../auth/AuthShell";
import { PasswordField } from "../auth/PasswordField";
import { Check, Download, FileIcon, ToolGlyph, Trash } from "../Icons";
import { Message } from "../Message";
import {
  clearHistory,
  deleteAccount,
  deleteFile,
  downloadUrl,
  getProfile,
  listFiles,
  listHistory,
  storageLimit,
  storageUsed,
  updateProfile,
  type HistoryItem,
  type Profile,
  type SavedFile,
} from "@/lib/account";
import { formatBytes } from "@/lib/files";
import { PLAN_BY_ID } from "@/lib/plans";
import { friendlyAuthError, getSupabase } from "@/lib/supabase";
import { TOOL_BY_SLUG, type ToolSlug } from "@/lib/tools";

function when(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400_000);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (days < 1 && new Date().getDate() === d.getDate()) return `Today, ${time}`;
  if (days < 2) return `Yesterday, ${time}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

export function Dashboard() {
  const { enabled, loading, session, signOut } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [files, setFiles] = useState<SavedFile[] | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    params.get("welcome") ? "Your account is ready. Results you make are now added to your history, and you can save any of them here." : params.get("password") ? "Your password was changed." : null,
  );

  const leaving = useRef(false);
  useEffect(() => {
    if (!loading && enabled && !session && !leaving.current) router.replace("/login/?next=/dashboard/");
  }, [loading, enabled, session, router]);

  const load = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      const plan = p?.plan ?? "free";
      const [f, h] = await Promise.all([listFiles(), listHistory(PLAN_BY_ID[plan].historyDays)]);
      setFiles(f);
      setHistory(h);
    } catch (e) {
      setError(friendlyAuthError(e));
    }
  }, []);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  if (!enabled) return <NotReady />;
  if (loading || !session) {
    return (
      <div className="wrap dash">
        <p className="hint">Opening your dashboard…</p>
      </div>
    );
  }

  const plan = PLAN_BY_ID[profile?.plan ?? "free"];
  const used = files ? storageUsed(files) : 0;
  const limit = storageLimit(plan.id);
  const pct = Math.min(100, (used / limit) * 100);
  const first = profile?.full_name?.split(" ")[0];

  return (
    <div className="wrap dash">
      <div className="dash-head">
        <div>
          <h1>{first ? `Hi, ${first}` : "Your dashboard"}</h1>
          <p className="hint">
            {session.user.email} · <span className="plan-badge">{plan.name} plan</span>
          </p>
        </div>
        <Link href="/tools/" className="btn btn-primary">
          Open a tool
        </Link>
      </div>

      {notice && (
        <div className="dash-notice" role="status">
          <span className="tick">
            <Check size={14} strokeWidth={3} />
          </span>
          <p>{notice}</p>
          <button type="button" className="btn btn-quiet" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}
      {error && <Message kind="error">{error}</Message>}

      <div className="dash-stats">
        <div className="stat">
          <span>Saved files</span>
          <strong>{files ? files.length : "…"}</strong>
        </div>
        <div className="stat">
          <span>Storage</span>
          <strong>
            {formatBytes(used)} <small>of {formatBytes(limit)}</small>
          </strong>
          <div className="meter" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used">
            <div style={{ width: `${pct}%` }} className={pct > 90 ? "full" : ""} />
          </div>
        </div>
        <div className="stat">
          <span>{plan.historyDays ? `Made in the last ${plan.historyDays} days` : "Files made"}</span>
          <strong>{history ? history.length : "…"}</strong>
        </div>
      </div>

      <div className="dash-grid">
        <section className="dash-card" aria-labelledby="saved-h">
          <h2 id="saved-h">Saved files</h2>
          {files && files.length === 0 && (
            <p className="empty">
              Nothing saved yet. After any tool finishes, press <strong>Save to my files</strong> to keep the result here and open it on any device.
            </p>
          )}
          <ul className="dash-list">
            {files?.map((f) => (
              <li key={f.id}>
                <span className="dash-icon">{f.tool && f.tool in TOOL_BY_SLUG ? <ToolGlyph slug={f.tool as ToolSlug} size={18} /> : <FileIcon size={18} />}</span>
                <span className="dash-meta">
                  <strong title={f.name}>{f.name}</strong>
                  <span>
                    {formatBytes(Number(f.size))} · {when(f.created_at)}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Download ${f.name}`}
                  onClick={async () => {
                    try {
                      window.location.assign(await downloadUrl(f));
                    } catch (e) {
                      setError(friendlyAuthError(e));
                    }
                  }}
                >
                  <Download size={18} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Delete ${f.name}`}
                  onClick={async () => {
                    if (!window.confirm(`Delete ${f.name}? This can't be undone.`)) return;
                    try {
                      await deleteFile(f);
                      setFiles((prev) => prev?.filter((x) => x.id !== f.id) ?? null);
                    } catch (e) {
                      setError(friendlyAuthError(e));
                    }
                  }}
                >
                  <Trash size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="dash-card" aria-labelledby="hist-h">
          <div className="dash-card-head">
            <h2 id="hist-h">History</h2>
            {history && history.length > 0 && (
              <button
                type="button"
                className="btn btn-quiet"
                onClick={async () => {
                  if (!window.confirm("Clear your whole history? Saved files are kept.")) return;
                  try {
                    await clearHistory();
                    setHistory([]);
                  } catch (e) {
                    setError(friendlyAuthError(e));
                  }
                }}
              >
                Clear
              </button>
            )}
          </div>
          {history && history.length === 0 && <p className="empty">What you make with Readily while logged in shows up here. Only names and sizes are recorded, never the files.</p>}
          <ul className="dash-list">
            {history?.map((h) => {
              const t = TOOL_BY_SLUG[h.tool as ToolSlug];
              const names = h.files.map((x) => x.name);
              return (
                <li key={h.id}>
                  <span className="dash-icon">{t ? <ToolGlyph slug={t.slug} size={18} /> : <FileIcon size={18} />}</span>
                  <span className="dash-meta">
                    <strong>{t ? <Link href={`/${t.slug}/`}>{t.name}</Link> : h.tool}</strong>
                    <span title={names.join(", ")}>
                      {names.slice(0, 2).join(", ")}
                      {names.length > 2 ? ` and ${names.length - 2} more` : ""} · {when(h.created_at)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          {plan.historyDays > 0 && <p className="fine">The Free plan keeps {plan.historyDays} days of history.</p>}
        </section>
      </div>

      <PlanCard profile={profile} onChange={setProfile} />
      <Settings
        profile={profile}
        email={session.user.email ?? ""}
        onName={(full_name) => setProfile((p) => (p ? { ...p, full_name } : p))}
        onSignOut={async () => {
          leaving.current = true;
          await signOut();
          router.replace("/");
        }}
      />
    </div>
  );
}

function PlanCard({ profile, onChange }: { profile: Profile | null; onChange: (p: Profile) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!profile) return null;
  const current = PLAN_BY_ID[profile.plan];
  async function join(id: "pro" | "ai-plus") {
    if (!profile) return;
    setBusy(true);
    setErr(null);
    try {
      await updateProfile({ plan_interest: id });
      onChange({ ...profile, plan_interest: id });
    } catch (e) {
      setErr(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="dash-card dash-plan" aria-labelledby="plan-h">
      <div>
        <h2 id="plan-h">Your plan: {current.name}</h2>
        {profile.plan === "free" && (
          <p>
            {profile.plan_interest
              ? `You're on the ${PLAN_BY_ID[profile.plan_interest].name} waitlist. We'll email you when it opens.`
              : "Need more room or the AI assistant? Join a waitlist and we'll email you when paid plans open."}
          </p>
        )}
        {err && <Message kind="error">{err}</Message>}
      </div>
      {profile.plan === "free" && (
        <div className="plan-actions">
          {(["pro", "ai-plus"] as const).map((id) =>
            profile.plan_interest === id ? (
              <span key={id} className="status-pill">
                <Check size={16} strokeWidth={3} />
                On the {PLAN_BY_ID[id].name} waitlist
              </span>
            ) : (
              <button key={id} type="button" className={`btn ${profile.plan_interest ? "btn-secondary" : "btn-primary"}`} disabled={busy} onClick={() => join(id)}>
                {profile.plan_interest ? `Switch to ${PLAN_BY_ID[id].name} waitlist` : `Join ${PLAN_BY_ID[id].name} waitlist (${PLAN_BY_ID[id].price}/mo)`}
              </button>
            ),
          )}
          <Link href="/pricing/" className="btn btn-quiet">
            Compare plans
          </Link>
        </div>
      )}
    </section>
  );
}

function Settings({ profile, email, onName, onSignOut }: { profile: Profile | null; email: string; onName: (n: string) => void; onSignOut: () => void }) {
  const [name, setName] = useState(profile?.full_name ?? "");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => setName(profile?.full_name ?? ""), [profile?.full_name]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateProfile({ full_name: name.trim() || null });
      onName(name.trim());
      setMsg({ kind: "ok", text: "Name saved." });
    } catch (x) {
      setMsg({ kind: "error", text: friendlyAuthError(x) });
    }
  }
  async function savePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setMsg({ kind: "error", text: "Choose a password with at least 8 characters." });
    try {
      const sb = await getSupabase();
      const { error } = await sb.auth.updateUser({ password: pw });
      if (error) throw error;
      setPw("");
      setMsg({ kind: "ok", text: "Password changed." });
    } catch (x) {
      setMsg({ kind: "error", text: friendlyAuthError(x) });
    }
  }

  return (
    <section className="dash-card" aria-labelledby="set-h">
      <h2 id="set-h">Account</h2>
      {msg && (msg.kind === "error" ? <Message kind="error">{msg.text}</Message> : <p className="ok-line">{msg.text}</p>)}
      <div className="settings-grid">
        <form onSubmit={saveName} className="auth-stack">
          <div className="field">
            <label className="field-label" htmlFor="dname">
              Name
            </label>
            <input id="dname" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
          </div>
          <button type="submit" className="btn btn-secondary">
            Save name
          </button>
        </form>
        <form onSubmit={savePw} className="auth-stack">
          <input type="email" autoComplete="username" value={email} readOnly hidden />
          <PasswordField id="dpw" label="New password" value={pw} onChange={setPw} autoComplete="new-password" />
          <button type="submit" className="btn btn-secondary" disabled={!pw}>
            Change password
          </button>
        </form>
      </div>
      <div className="danger-zone">
        <button type="button" className="btn btn-secondary" onClick={onSignOut}>
          Log out
        </button>
        <details>
          <summary>Delete my account</summary>
          <p>This permanently deletes your saved files, history and account. Type DELETE to confirm.</p>
          <div className="input-row">
            <input className="input" style={{ maxWidth: 200 }} value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type DELETE to confirm" />
            <button
              type="button"
              className="btn btn-danger"
              disabled={confirm !== "DELETE" || deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await deleteAccount();
                  window.location.assign("/?deleted=1");
                } catch (x) {
                  setMsg({ kind: "error", text: friendlyAuthError(x) });
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting" : "Delete forever"}
            </button>
          </div>
        </details>
      </div>
    </section>
  );
}
