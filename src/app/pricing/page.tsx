import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlanCards } from "@/components/PlanCards";
import { SITE } from "@/lib/site";
import { paymentsEnabled } from "@/lib/billing";
import { PAID_TOOLS, PLANS, PLAN_BY_ID, allowance, type Level } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Readily's 20 everyday file tools are free. Basic, Pro and Premium add pro-quality tools and AI for voice, photos, video and documents.",
  alternates: { canonical: "/pricing/" },
  openGraph: { url: "/pricing/", title: "Readily plans: Free, Basic, Pro and Premium" },
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
    q: "How do I pay?",
    a: "By card through Stripe, monthly or yearly. Readily never sees or stores your card number. You can change plan, update your card, download invoices or cancel any time from your dashboard.",
  },
  {
    q: "Can I get a refund?",
    a: "If something isn't right, email us within 14 days of your first payment and we'll refund it. See the refund policy for details.",
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE.name,
    url: `${SITE.url}/`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (runs in the browser)",
    offers: PLANS.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: p.price.replace("$", ""),
      priceCurrency: "USD",
      description: p.tagline,
      ...(p.id !== "free" ? { priceSpecification: { "@type": "UnitPriceSpecification", price: p.price.replace("$", ""), priceCurrency: "USD", unitCode: "MON" } } : {}),
    })),
  };
  return (
    <div className="wrap pricing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="pricing-head">
        <h1>Everyday tools are free. Pay for pro results.</h1>
        <p>
          All 20 everyday tools stay free for everyone. Plans add higher-quality tools and AI for voice, photos, video and documents.
        </p>
        {!paymentsEnabled && <p className="pricing-soon">Paid plans open soon. Join a waitlist, or sign up free to try every Basic and Pro tool once.</p>}
      </div>

      <Suspense fallback={<div className="plans plans-4" style={{ minHeight: 600 }} />}>
        <PlanCards />
      </Suspense>

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
                <td>20 MB</td>
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
