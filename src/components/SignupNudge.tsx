"use client";

// A small reminder for new visitors explaining why an account helps.
// Appears after a first result (or after a while on the site), slides away by
// itself, and stays quiet for a few days once seen or closed.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { Check, Close } from "./Icons";
import { SIGNUP_REASONS } from "@/lib/plans";

const KEY = "readily.nudge";
const QUIET_DAYS = 3;
const SHOW_MS = 9000;

function quiet(): boolean {
  try {
    const at = Number(localStorage.getItem(KEY) || 0);
    return Date.now() - at < QUIET_DAYS * 86400_000;
  } catch {
    return true;
  }
}
function markSeen() {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage blocked: the reminder simply shows again next visit */
  }
}

export function SignupNudge() {
  const { enabled, loading, session } = useAuth();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shown = useRef(false);

  const hide = useCallback(() => {
    setLeaving(true);
    setTimeout(() => {
      setShow(false);
      setLeaving(false);
    }, 300);
  }, []);

  const open = useCallback(() => {
    if (shown.current || quiet()) return;
    shown.current = true;
    markSeen();
    setShow(true);
    timer.current = setTimeout(hide, SHOW_MS);
  }, [hide]);

  const eligible = enabled && !loading && !session && !/^\/(login|signup|dashboard|forgot-password|reset-password)/.test(pathname);

  useEffect(() => {
    if (!eligible) return;
    // After someone gets a first result, show it at the moment it's most useful.
    const onResult = () => setTimeout(open, 1500);
    window.addEventListener("readily:result", onResult);
    // Otherwise, a gentle reminder after some time on the site.
    const t = setTimeout(open, 30000);
    return () => {
      window.removeEventListener("readily:result", onResult);
      clearTimeout(t);
    };
  }, [eligible, open]);

  useEffect(() => {
    if (session && show) hide();
  }, [session, show, hide]);

  if (!show) return null;
  return (
    <div
      className={`nudge${leaving ? " leaving" : ""}`}
      role="status"
      aria-live="polite"
      onMouseEnter={() => timer.current && clearTimeout(timer.current)}
      onMouseLeave={() => (timer.current = setTimeout(hide, 4000))}
      onFocus={() => timer.current && clearTimeout(timer.current)}
    >
      <button type="button" className="icon-btn nudge-x" aria-label="Close" onClick={hide}>
        <Close size={18} />
      </button>
      <p className="nudge-title">Keep your work with a free account</p>
      <ul>
        {SIGNUP_REASONS.map((r) => (
          <li key={r}>
            <Check size={14} strokeWidth={3} />
            {r}
          </li>
        ))}
      </ul>
      <div className="nudge-actions">
        <Link href="/signup/" className="btn btn-primary btn-small" onClick={hide}>
          Sign up free
        </Link>
        <button type="button" className="btn btn-quiet" onClick={hide}>
          Not now
        </button>
      </div>
      {!leaving && <span className="nudge-timer" style={{ animationDuration: `${SHOW_MS}ms` }} aria-hidden="true" />}
    </div>
  );
}
