"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { User } from "./Icons";

export function AccountNav() {
  const { enabled, loading, session } = useAuth();
  if (!enabled) {
    return (
      <Link href="/pricing/" className="nav-pricing-only">
        Pricing
      </Link>
    );
  }
  if (loading) return <span className="account-nav" aria-hidden="true" />;
  if (session) {
    const label = (session.user.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "Dashboard";
    return (
      <span className="account-nav">
        <Link href="/dashboard/" className="btn btn-secondary btn-small">
          <User size={16} />
          {label}
        </Link>
      </span>
    );
  }
  return (
    <span className="account-nav">
      <Link href="/login/" className="nav-login">
        Log in
      </Link>
      <Link href="/signup/" className="btn btn-primary btn-small">
        Sign up free
      </Link>
    </span>
  );
}
