import { HomeDrop } from "@/components/HomeDrop";
import { Check } from "@/components/Icons";
import { ToolDirectory } from "@/components/ToolDirectory";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="hero">
        <div className="wrap">
          <div>
            <h1>Get any file ready for wherever it&apos;s going.</h1>
            <p className="hero-lead">
              Turn photos into a PDF, merge and split PDFs, or shrink an image to the exact size a form asks for.
            </p>
            <ul className="hero-facts">
              {["Runs on your device. Files are never uploaded.", "Free, with no signup and no watermark.", "Hit exact targets like 200 KB or 600 × 600 px."].map((t) => (
                <li key={t}>
                  <span className="tick">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <HomeDrop />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <ToolDirectory heading="Every tool" intro={`${TOOLS.length} tools, each on its own page. More are on the way.`} />
        </div>
      </section>

      <section className="section principles">
        <div className="wrap">
          <h2>Built for forms, applications and inboxes with strict limits.</h2>
          <ul className="principle-list">
            <li>
              <strong>Your files stay with you</strong>
              <p>Everything happens in your browser. Readily has no server that could see, store or leak your documents.</p>
            </li>
            <li>
              <strong>Say the size you need</strong>
              <p>Ask for under 200 KB or exactly 600 × 600 px. Readily works out the settings and checks the result for you.</p>
            </li>
            <li>
              <strong>One result leads to the next</strong>
              <p>Resize a photo, compress it, then add it to a PDF without downloading and re-uploading in between.</p>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
