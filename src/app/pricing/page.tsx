import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "@/components/Icons";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Every Readily tool is free. Sign up free for a dashboard with history and saved files, or join the waitlist for Pro and AI Plus.",
  alternates: { canonical: "/pricing/" },
};

const FAQ = [
  {
    q: "Is Readily really free?",
    a: "Yes. All tools work without an account, without watermarks and without daily limits. Your files are processed on your own device, which costs us almost nothing, so we can keep the tools free.",
  },
  {
    q: "Why would I create an account?",
    a: "A free account gives you a dashboard: a history of what you've made, and space to save files so you can open them later or on another device. Nothing is saved unless you choose to save it.",
  },
  {
    q: "When can I buy Pro or AI Plus?",
    a: "Paid plans open soon. Join the waitlist and we'll email you when they're ready. Until then, every free feature keeps working.",
  },
  {
    q: "What happens to files I save?",
    a: "Saved files are stored privately in your account, visible only to you. You can delete any file, or your whole account, at any time from your dashboard.",
  },
  {
    q: "Can I cancel a paid plan?",
    a: "Yes, any time, and you keep paid features until the end of the month you paid for. Your tools stay free either way.",
  },
];

export default function Pricing() {
  return (
    <div className="wrap pricing">
      <div className="pricing-head">
        <h1>Free to use. Pay only for extra room.</h1>
        <p>Every tool is free for everyone. Plans add a personal dashboard, cloud storage and, soon, an AI assistant that does the steps for you.</p>
      </div>

      <div className="plans">
        {PLANS.map((p) => (
          <section key={p.id} className={`plan${p.highlight ? " plan-hi" : ""}`} aria-labelledby={`plan-${p.id}`}>
            {p.highlight && <p className="plan-flag">Most popular</p>}
            <h2 id={`plan-${p.id}`}>{p.name}</h2>
            <p className="plan-price">
              <strong>{p.price}</strong> <span>{p.period}</span>
            </p>
            <p className="plan-tagline">{p.tagline}</p>
            {p.id === "free" ? (
              <div className="plan-ctas">
                <Link href="/tools/" className="btn btn-secondary btn-block">
                  Use the tools
                </Link>
                <Link href="/signup/" className="btn btn-primary btn-block">
                  Sign up free
                </Link>
              </div>
            ) : (
              <div className="plan-ctas">
                <Link href={`/signup/?plan=${p.id}`} className={`btn ${p.highlight ? "btn-primary" : "btn-secondary"} btn-block`}>
                  Join the {p.name} waitlist
                </Link>
                <p className="plan-note">Payments open soon. No card needed to join.</p>
              </div>
            )}
            <ul className="plan-features">
              {p.features.map((f) => (
                <li key={f.text}>
                  <span className="tick">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span>
                    {f.text}
                    {f.soon && <span className="tag-soon">Soon</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="section" aria-labelledby="pfaq" style={{ paddingBottom: 0 }}>
        <div className="narrow-col">
          <h2 id="pfaq">Questions about plans</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
