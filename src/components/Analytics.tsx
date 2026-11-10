"use client";

// Privacy-friendly visit counting. No cookies, no IP addresses, no user IDs and no
// third-party scripts: the database only keeps daily totals such as "the Merge PDF
// page was viewed 40 times today". Browsers that ask not to be tracked are skipped.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { accountsEnabled, publicRpc } from "@/lib/supabase";

const KEY_RE = /^[a-z0-9/_-]{1,80}$/;

function store(get: true, k: string): string | null;
function store(get: false, k: string, v: string): void;
function store(get: boolean, k: string, v?: string) {
  try {
    if (get) return localStorage.getItem(k);
    localStorage.setItem(k, v!);
  } catch {
    return null;
  }
}

function shouldCount(): boolean {
  if (!accountsEnabled || typeof window === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return false;
  if (nav.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(nav.userAgent)) return false;
  // The site owner's own browsing (set when the admin page is opened) isn't counted.
  if (store(true, "readily-admin") === "1") return false;
  return true;
}

function send(kind: "visit" | "view" | "tool", key: string) {
  const k = key.toLowerCase().slice(0, 80);
  if (KEY_RE.test(k)) publicRpc("track", { p_kind: kind, p_key: k });
}

/** Where the visitor came from: "direct", or the linking site, e.g. "google-com". */
function source(): string {
  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (host === location.hostname) return "direct";
    return host.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "direct";
  } catch {
    return "direct";
  }
}

function pageKey(path: string): string {
  const p = path.replace(/\/+$/, "") || "/";
  return p.replace(/[^a-z0-9/_-]/gi, "-");
}

export function Analytics() {
  const pathname = usePathname();

  // One "visit" per browser per day, labelled with where it came from.
  useEffect(() => {
    if (!shouldCount()) return;
    const today = new Date().toISOString().slice(0, 10);
    if (store(true, "readily-visit") === today) return;
    store(false, "readily-visit", today);
    send("visit", source());
  }, []);

  // Every page view, including moves between pages inside the site.
  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || !shouldCount()) return;
    send("view", pageKey(pathname));
  }, [pathname]);

  // Every finished tool run (any tool, signed in or not).
  useEffect(() => {
    const onResult = (e: Event) => {
      const tool = (e as CustomEvent<{ tool?: string }>).detail?.tool;
      if (tool && shouldCount()) send("tool", tool);
    };
    window.addEventListener("readily:result", onResult);
    return () => window.removeEventListener("readily:result", onResult);
  }, []);

  return null;
}
