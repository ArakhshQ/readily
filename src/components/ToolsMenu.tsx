"use client";

// Header "Tools" menu: every tool by category with instant search.
// Opens with the button, or Ctrl/Cmd + K from anywhere.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Close, Grid, Search, ToolGlyph } from "./Icons";
import { CATEGORIES, TOOLS, searchTools } from "@/lib/tools";

export function ToolsMenu() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen((o) => {
          if (o) button.current?.focus();
          return false;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => input.current?.focus(), 10);
      document.body.classList.add("menu-open");
    } else document.body.classList.remove("menu-open");
  }, [open]);

  const found = searchTools(q);
  const foundSet = new Set(found.map((t) => t.slug));

  return (
    <>
      <button
        ref={button}
        type="button"
        className={`tools-btn${open ? " on" : ""}`}
        aria-expanded={open}
        aria-controls="tools-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <Grid size={18} />
        All tools
        <kbd className="kbd">Ctrl K</kbd>
      </button>
      {open && (
        <>
          <div className="menu-scrim" onClick={() => setOpen(false)} aria-hidden="true" />
          <div id="tools-panel" className="tools-panel" role="dialog" aria-label="All tools">
            <div className="tools-panel-head">
              <label className="search menu-search">
                <span className="sr-only">Search tools</span>
                <Search size={18} />
                <input
                  ref={input}
                  type="search"
                  value={q}
                  placeholder={`Search ${TOOLS.length} tools, like “compress” or “mp3”`}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && found[0]) {
                      window.location.assign(`/${found[0].slug}/`);
                    }
                  }}
                />
              </label>
              <button type="button" className="icon-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
                <Close size={20} />
              </button>
            </div>
            {q && found.length === 0 && <p className="empty-search">No tool matches “{q}”. Try a simpler word like “pdf”, “photo” or “video”.</p>}
            <div className="tools-panel-grid">
              {CATEGORIES.map((c) => {
                const list = TOOLS.filter((t) => t.category === c.id && foundSet.has(t.slug));
                if (!list.length) return null;
                return (
                  <section key={c.id}>
                    <h3>
                      <Link href={c.path}>{c.name}</Link>
                    </h3>
                    <ul>
                      {list.map((t) => (
                        <li key={t.slug}>
                          <Link href={`/${t.slug}/`} className="menu-tool">
                            <span className="menu-glyph">
                              <ToolGlyph slug={t.slug} size={18} />
                            </span>
                            <span>
                              <strong>
                                {t.name}
                                {t.isNew && <span className="tag-new">New</span>}
                              </strong>
                              <span>{t.short}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
