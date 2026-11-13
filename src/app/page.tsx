import { HomeDrop } from "@/components/HomeDrop";
import Link from "next/link";
import type { Metadata } from "next";
import { Check, ToolGlyph } from "@/components/Icons";
import { PlanTag } from "@/components/PlanTag";
import { ToolDirectory } from "@/components/ToolDirectory";
import { TOOLS, TOOL_BY_SLUG } from "@/lib/tools";

const FREE = TOOLS.filter((t) => !t.level).length;
const AI_PICKS = ["noise-remover", "remove-background", "transcribe", "studio-voice", "translate-document", "restore-photo", "ai-dubbing", "ai-photo-editor"] as const;

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <h1>Get any file ready for wherever it&apos;s going.</h1>
            <p className="hero-lead">
              {FREE} free tools for PDFs, images, video and audio, plus AI tools for voice, photos and documents. Shrink a photo to the size a form asks for, sign a PDF, or clean up a recording.
            </p>
            <ul className="hero-facts">
              {["Everyday tools run on your device. Files are never uploaded.", "Free, with no signup and no watermark.", "Hit exact targets like 200 KB or 600 × 600 px."].map((t) => (
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

      <section className="section ai-home" aria-labelledby="ai-h">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2 id="ai-h">AI tools for pro results</h2>
              <p>Clean voices, cut-out photos, transcripts, translations and more. Sign up free to try each one.</p>
            </div>
            <Link href="/ai-tools/" className="btn btn-secondary">
              All AI tools
            </Link>
          </div>
          <ul className="ai-cards">
            {AI_PICKS.map((slug) => {
              const t = TOOL_BY_SLUG[slug];
              return (
                <li key={slug}>
                  <Link href={`/${slug}/`} className="ai-card">
                    <span className="tool-glyph">
                      <ToolGlyph slug={slug} />
                    </span>
                    <strong>
                      {t.name}
                      <PlanTag tool={t} />
                    </strong>
                    <span>{t.short}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <ToolDirectory heading="Every tool" intro={`${TOOLS.length} tools in four groups, ${FREE} of them free with no signup. Search, or pick one below.`} />
        </div>
      </section>

      <section className="section principles">
        <div className="wrap">
          <h2>Built for forms, applications and inboxes with strict limits.</h2>
          <ul className="principle-list">
            <li>
              <strong>Your files stay with you</strong>
              <p>Everyday tools work in your browser, so your documents never leave your device. AI tools say so before anything is sent, and delete it within 24 hours.</p>
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
