"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Search, ToolGlyph } from "./Icons";
import { CATEGORIES, TOOLS, searchTools } from "@/lib/tools";

export function ToolDirectory({ heading, intro, headingLevel = 2 }: { heading: string; intro: string; headingLevel?: 1 | 2 }) {
  const [q, setQ] = useState("");
  const found = new Set(searchTools(q).map((t) => t.slug));
  const H = headingLevel === 1 ? "h1" : "h2";
  return (
    <>
      <div className="section-head">
        <div>
          <H>{heading}</H>
          <p>{intro}</p>
        </div>
        <label className="search">
          <span className="sr-only">Search tools</span>
          <Search size={18} />
          <input type="search" placeholder="Try “pdf” or “200 KB”" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div className="directory">
        {CATEGORIES.map((c) => {
          const tools = TOOLS.filter((t) => t.category === c.id && found.has(t.slug));
          return (
            <section key={c.id} aria-labelledby={`cat-${c.id}`}>
              <h3 id={`cat-${c.id}`}>
                {c.name} <small>{c.blurb}</small>
              </h3>
              {tools.length ? (
                <ul className="tool-rows">
                  {tools.map((t) => (
                    <li key={t.slug}>
                      <Link href={`/${t.slug}/`} className="tool-row">
                        <span className="tool-glyph">
                          <ToolGlyph slug={t.slug} />
                        </span>
                        <span>
                          <strong>{t.name}</strong>
                          <span>{t.short}</span>
                        </span>
                        <span className="tool-go">
                          <ArrowRight size={20} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-search">No {c.name.toLowerCase()} match “{q}”.</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
