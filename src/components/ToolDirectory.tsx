"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Search, ToolGlyph } from "./Icons";
import { CATEGORIES, TOOLS, searchTools, type Category } from "@/lib/tools";

interface Props {
  heading: string;
  intro: string;
  headingLevel?: 1 | 2;
  /** Show only one category (category pages). */
  only?: Category;
}

export function ToolDirectory({ heading, intro, headingLevel = 2, only }: Props) {
  const [q, setQ] = useState("");
  const found = new Set(searchTools(q).map((t) => t.slug));
  const H = headingLevel === 1 ? "h1" : "h2";
  const cats = CATEGORIES.filter((c) => !only || c.id === only);
  const anyFound = cats.some((c) => TOOLS.some((t) => t.category === c.id && found.has(t.slug)));
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
          <input type="search" placeholder="Try “pdf”, “200 KB” or “mp3”" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {!anyFound && <p className="empty-search">No tool matches “{q}”. Try a simpler word like “pdf”, “photo” or “video”.</p>}
      <div className={`directory${only ? " single" : ""}`}>
        {cats.map((c) => {
          const tools = TOOLS.filter((t) => t.category === c.id && found.has(t.slug));
          if (!tools.length) return null;
          return (
            <section key={c.id} aria-labelledby={`cat-${c.id}`}>
              {!only && (
                <h3 id={`cat-${c.id}`}>
                  <Link href={c.path}>{c.name}</Link> <small>{c.blurb}</small>
                </h3>
              )}
              <ul className="tool-rows">
                {tools.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/${t.slug}/`} className="tool-row">
                      <span className="tool-glyph">
                        <ToolGlyph slug={t.slug} />
                      </span>
                      <span>
                        <strong>
                          {t.name}
                          {t.isNew && <span className="tag-new">New</span>}
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
    </>
  );
}
