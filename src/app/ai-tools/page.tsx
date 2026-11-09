import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ToolGlyph } from "@/components/Icons";
import { PlanTag } from "@/components/PlanTag";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = {
  title: "AI tools for voice, photos, video and documents",
  description:
    "Readily's AI tools: remove background noise, enhance voice, transcribe, add subtitles, summarize and translate PDFs, remove backgrounds, restore and upscale photos, dub videos and more. Try each one free.",
  alternates: { canonical: "/ai-tools/" },
  openGraph: { url: "/ai-tools/", images: [{ url: "/og/ai-tools.png", width: 1200, height: 630 }] },
};

const GROUPS = [
  { level: 1, name: "Basic", price: "$4.99/mo", blurb: "Pro-quality tools that run on your device, plus AI for documents and transcription." },
  { level: 2, name: "Pro", price: "$11.99/mo", blurb: "Studio voice, subtitles, translation, photo restoration and a file assistant." },
  { level: 3, name: "Premium", price: "$29.99/mo", blurb: "The best AI voice, video and image engines." },
];

export default function AiTools() {
  const paid = TOOLS.filter((t) => (t.level ?? 0) > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Readily AI tools",
    itemListElement: paid.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE.url}/${t.slug}/`, name: t.name })),
  };
  return (
    <div className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="pricing-head" style={{ paddingTop: "clamp(40px, 6vw, 72px)" }}>
        <h1>AI tools that do the hard part</h1>
        <p>
          Clean up a voice, cut out a photo, transcribe a lecture, translate a contract or dub a video. Sign up free to try each Basic and Pro tool
          once, then pick the <Link href="/pricing/">plan</Link> that fits.
        </p>
      </div>
      {GROUPS.map((g) => {
        const tools = paid.filter((t) => t.level === g.level);
        return (
          <section key={g.level} className="section" style={{ paddingTop: 8 }} aria-labelledby={`g${g.level}`}>
            <h2 id={`g${g.level}`}>
              {g.name} tools <small className="muted-inline">{g.price}</small>
            </h2>
            <p className="compare-intro">{g.blurb}</p>
            <ul className="tool-rows tool-rows-2">
              {tools.map((t) => (
                <li key={t.slug}>
                  <Link href={`/${t.slug}/`} className="tool-row">
                    <span className="tool-glyph">
                      <ToolGlyph slug={t.slug} />
                    </span>
                    <span>
                      <strong>
                        {t.name}
                        <PlanTag tool={t} />
                      </strong>
                      <span>{t.short}</span>
                    </span>
                    <span className="tool-go">
                      <ArrowRight size={20} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
