import Link from "next/link";
import { Check, Logo } from "../Icons";
import { SIGNUP_REASONS } from "@/lib/plans";

/** Two-column frame for the account pages: the form, and why an account helps. */
export function AuthShell({ title, intro, children, aside = true }: { title: string; intro?: React.ReactNode; children: React.ReactNode; aside?: boolean }) {
  return (
    <div className="wrap auth-wrap">
      <div className={`auth-grid${aside ? "" : " solo"}`}>
        <div className="auth-card">
          <h1>{title}</h1>
          {intro && <p className="auth-intro">{intro}</p>}
          {children}
        </div>
        {aside && (
          <aside className="auth-aside" aria-label="Why create an account">
            <Logo size={36} />
            <h2>Every tool stays free. An account remembers your work.</h2>
            <ul>
              {SIGNUP_REASONS.map((r) => (
                <li key={r}>
                  <span className="tick">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  {r}
                </li>
              ))}
            </ul>
            <p>
              Files you work on still stay on your device. Only files you choose to save go to your private storage.{" "}
              <Link href="/pricing/">See plans</Link>
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}

export function NotReady() {
  return (
    <AuthShell title="Accounts are opening soon" intro="You can already use every tool for free, without an account.">
      <Link href="/tools/" className="btn btn-primary">
        Browse the tools
      </Link>
    </AuthShell>
  );
}
