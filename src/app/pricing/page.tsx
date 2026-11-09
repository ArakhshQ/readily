import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "@/components/Icons";
import { PAID_TOOLS, PLANS, PLAN_BY_ID, allowance, type Level } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Readily's 20 everyday file tools are free. Basic, Pro and Premium add pro-quality tools and AI for voice, photos, video and documents.",
  alternates: { canonical: "/pricing/" },
};

const LEVELS: { level: Level; name: string; note: string }[] = [
  { level: 1, name: "Basic tools", note: "Most run on your device, so they're unlimited." },
  { level: 2, name: "Pro tools", note: "AI that runs on our servers, paid for with credits." },
  { level: 3, name: "Premium tools", note: "The highest-quality AI voice, video and image engines." },
];

const FAQ = [
  {
    q: "Is Readily really free?",
    a: "Yes. The 20 everyday tools work without an account, without watermarks and without daily limits. They run on your own device, which costs us almost nothing, so they stay free.",
  },
  {
    q: "What are AI credits?",
    a: "Tools that run on our AI servers use credits, and each plan comes with a monthly amount. Simple jobs cost 1 credit, like summarizing a document or transcribing one minute of audio. Heavier jobs cost more, like 30 credits for a minute of best-quality voice cleanup. Tools that run on your device never use credits.",
  },
  {
    q: "Do unused credits roll over?",
    a: "No, credits refresh at the start of each billing month.",
  },
  {
    q: "When can I buy a plan?",
    a: "The paid tools are being built now. Join a waitlist and we'll email you when your plan opens. No card is needed, and every free tool keeps working.",
  },
  {
    q: "Do AI tools upload my files?",
    a: "The free tools and most Basic tools never upload anything. AI tools that run on our servers need to send the file to process it; we'll always tell you before that happens, and files are deleted after processing.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, any time. You keep your plan until the end of the period you paid for, and the free tools stay free either way.",
  },
];

export default function Pricing() {
  const paid = PLANS.filter((p) => p.id !== "free");
  return (
    <div className="wrap pricing">
      <div className="pricing-head">
        <h1>Everyday tools are free. Pay for pro results.</h1>
        <p>
          All 20 everyday tools stay free for everyone. Plans add higher-quality tools and AI for voice, photos, video and documents.
        </p>
        <p className="pricing-soon">Paid tools are being built now. Join a waitlist and we&apos;ll email you when your plan opens.</p>
      </div>

      <div className="plans plans-4">
        {PLANS.map((p) => (
          <section key={p.id} className={`plan${p.highlight ? " plan-hi" : ""}`} aria-labelledby={`plan-${p.id}`}>
            {p.highlight && <p className="plan-flag">Most popular</p>}
            <h2 id={`plan-${p.id}`}>{p.name}</h2>
            <p className="plan-price">
              <strong>{p.price}</strong> <span>{p.period}</span>
            </p>
            <p className="plan-yearly">{p.yearly ? `or ${p.yearly} a year` : " "}</p>
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
                  Join the waitlist
                </Link>
                <p className="plan-note">No card needed</p>
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
        ))}
      </div>

      <section className="section" aria-labelledby="compare-h">
        <h2 id="compare-h">Every tool, plan by plan</h2>
        <p className="compare-intro">
          Numbers show how much one month&apos;s credits buy if you spend them all on that tool. Credits mix and match, so you can use a
          little of everything.
        </p>
        <div className="compare-scroll">
          <table className="compare">
            <thead>
              <tr>
                <th scope="col">Tool</th>
                <th scope="col">Free account</th>
                {paid.map((p) => (
                  <th key={p.id} scope="col" className={p.highlight ? "col-hi" : undefined}>
                    {p.name}
                    <span>{p.price}/mo</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  20 everyday tools
                  <span>Merge, compress, convert, sign, trim and more</span>
                </th>
                <td>Unlimited</td>
                {paid.map((p) => (
                  <td key={p.id}>Unlimited</td>
                ))}
              </tr>
              <tr>
                <th scope="row">AI credits</th>
                <td>{PLAN_BY_ID.free.credits} once</td>
                {paid.map((p) => (
                  <td key={p.id}>{`${p.credits.toLocaleString("en-US")}\u00a0/mo`}</td>
                ))}
              </tr>
              {LEVELS.map((g) => (
                <LevelRows key={g.level} level={g.level} name={g.name} note={g.note} />
              ))}
              <tr className="compare-group">
                <th scope="rowgroup" colSpan={5}>
                  Your account
                </th>
              </tr>
              <tr>
                <th scope="row">History</th>
                <td>30 days</td>
                {paid.map((p) => (
                  <td key={p.id}>Forever</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Saved files</th>
                <td>100 MB</td>
                {paid.map((p) => (
                  <td key={p.id}>{Math.round(p.storageBytes / 1024 ** 3)} GB</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" aria-labelledby="pfaq" style={{ paddingTop: 0, paddingBottom: 0 }}>
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

function LevelRows({ level, name, note }: { level: Level; name: string; note: string }) {
  const tools = PAID_TOOLS.filter((t) => t.level === level);
  return (
    <>
      <tr className="compare-group">
        <th scope="rowgroup" colSpan={5}>
          {name} <span>{note}</span>
        </th>
      </tr>
      {tools.map((t) => (
        <tr key={t.name}>
          <th scope="row">
            {t.name}
            <span>{t.what}</span>
            {t.credits > 0 && (
              <span className="compare-cost">
                {t.credits} {t.credits === 1 ? "credit" : "credits"} per {t.unit}
              </span>
            )}
          </th>
          {PLANS.map((p) => {
            const a = allowance(t, p);
            return (
              <td key={p.id} className={a === "—" ? "compare-no" : undefined}>
                {a === "—" ? <span aria-label="Not included">—</span> : a}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
