"use client";

// The four plan cards with a monthly / yearly switch. With payments on, the buttons
// go to Stripe Checkout; until then they join the waitlist.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Check } from "./Icons";
import { Message } from "./Message";
import { paymentsEnabled, startCheckout, type Interval } from "@/lib/billing";
import { PLANS, type PaidPlanId } from "@/lib/plans";

const YEARLY_SAVING: Record<string, string> = { basic: "Save $10.88", pro: "Save $24.88", premium: "Save $60.88" };

export function PlanCards() {
  const { session } = useAuth();
  const params = useSearchParams();
  const [interval, setInterval] = useState<Interval>("month");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canceled = params.get("canceled") === "1";

  async function buy(id: PaidPlanId) {
    setBusy(id);
    setError(null);
    try {
      await startCheckout(id, interval);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout couldn't open. Try again.");
      setBusy(null);
    }
  }

  return (
    <>
      <div className="interval-switch" role="radiogroup" aria-label="Billing">
        {(["month", "year"] as const).map((i) => (
          <button key={i} type="button" role="radio" aria-checked={interval === i} className={interval === i ? "on" : ""} onClick={() => setInterval(i)}>
            {i === "month" ? "Monthly" : "Yearly"}
            {i === "year" && <span className="save">2 months free</span>}
          </button>
        ))}
      </div>
      {canceled && <Message kind="note">Checkout was canceled, so nothing was charged. Pick a plan whenever you&apos;re ready.</Message>}
      {error && <Message kind="error">{error}</Message>}
      <div className="plans plans-4">
        {PLANS.map((p) => {
          const yearly = interval === "year" && p.yearly;
          return (
            <section key={p.id} className={`plan${p.highlight ? " plan-hi" : ""}`} aria-labelledby={`plan-${p.id}`}>
              {p.highlight && <p className="plan-flag">Most popular</p>}
              <h2 id={`plan-${p.id}`}>{p.name}</h2>
              <p className="plan-price">
                <strong>{yearly ? p.yearly : p.price}</strong> <span>{p.id === "free" ? p.period : yearly ? "per year" : "per month"}</span>
              </p>
              <p className="plan-yearly">{p.id === "free" ? " " : yearly ? YEARLY_SAVING[p.id] : `or ${p.yearly} a year`}</p>
              <p className="plan-tagline">{p.tagline}</p>
              {p.id === "free" ? (
                <div className="plan-ctas">
                  <Link href="/tools/" className="btn btn-secondary btn-block">
                    Use the tools
                  </Link>
                  {!session && (
                    <Link href="/signup/" className="btn btn-primary btn-block">
                      Sign up free
                    </Link>
                  )}
                </div>
              ) : (
                <div className="plan-ctas">
                  {paymentsEnabled && session ? (
                    <button type="button" className={`btn ${p.highlight ? "btn-primary" : "btn-secondary"} btn-block`} disabled={!!busy} onClick={() => buy(p.id as PaidPlanId)}>
                      {busy === p.id ? "Opening checkout…" : `Get ${p.name}`}
                    </button>
                  ) : (
                    <Link href={`/signup/?plan=${p.id}&interval=${interval}`} className={`btn ${p.highlight ? "btn-primary" : "btn-secondary"} btn-block`}>
                      {paymentsEnabled ? `Get ${p.name}` : "Join the waitlist"}
                    </Link>
                  )}
                  <p className="plan-note">{paymentsEnabled ? "Cancel any time" : "No card needed"}</p>
                </div>
              )}
              <ul className="plan-features">
                {p.highlights.map((f) => (
                  <li key={f}>
                    <span className="tick">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
