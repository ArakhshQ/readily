import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, ToolGlyph } from "@/components/Icons";
import { ToolRunner } from "@/components/ToolRunner";
import { SITE } from "@/lib/site";
import { CATEGORIES, TOOLS, TOOL_BY_SLUG, type ToolSlug } from "@/lib/tools";

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOL_BY_SLUG[slug as ToolSlug];
  if (!tool) return {};
  return {
    title: { absolute: tool.seoTitle },
    description: tool.seoDescription,
    keywords: tool.keywords,
    alternates: { canonical: `/${tool.slug}/` },
    openGraph: { title: tool.seoTitle, description: tool.seoDescription, url: `/${tool.slug}/` },
  };
}

export default async function ToolPage({ params }: Params) {
  const { slug } = await params;
  const tool = TOOL_BY_SLUG[slug as ToolSlug];
  if (!tool) notFound();
  const cat = CATEGORIES.find((c) => c.id === tool.category)!;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${tool.name} | ${SITE.name}`,
      url: `${SITE.url}/${tool.slug}/`,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any (runs in the browser)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: tool.seoDescription,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: tool.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="wrap narrow">
        <div className="tool-head">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Readily</Link> / <Link href={cat.path}>{cat.name}</Link>
          </nav>
          <h1>{tool.title}</h1>
          <p className="promise">{tool.promise}</p>
          <p className="local-badge">
            <Lock size={16} />
            Works on your device. Your files are never uploaded.
          </p>
        </div>

        <ToolRunner slug={tool.slug} />

        <section className="section" style={{ paddingBottom: 0 }} aria-labelledby="faq-h">
          <h2 id="faq-h">Questions</h2>
          <div className="faq">
            {tool.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="section" style={{ paddingBottom: 0 }} aria-labelledby="rel-h">
          <h2 id="rel-h">Often used next</h2>
          <div className="related">
            {tool.related.map((s) => {
              const t = TOOL_BY_SLUG[s];
              return (
                <Link key={s} href={`/${s}/`}>
                  <span className="tool-glyph">
                    <ToolGlyph slug={s} />
                  </span>
                  <span>
                    <strong>{t.name}</strong>
                    <span>{t.short}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
