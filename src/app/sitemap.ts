import type { MetadataRoute } from "next";
import { CONTENT_UPDATED, PAGES_UPDATED } from "@/lib/guides";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-static";

// Dates are the day the content really changed, not the build time, so search engines
// can trust them. Update CONTENT_UPDATED / PAGES_UPDATED when page text changes.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "tools/", "workspace/", "pdf-tools/", "image-tools/", "video-tools/", "audio-tools/", "writing-tools/", "ai-tools/", "pricing/", "about/", "privacy/", "terms/", "refunds/"].map((p) => ({
    url: `${SITE.url}/${p}`,
    lastModified: PAGES_UPDATED,
    priority: p === "" ? 1 : p.endsWith("tools/") || p === "workspace/" ? 0.7 : 0.3,
  }));
  const tools = TOOLS.map((t) => ({ url: `${SITE.url}/${t.slug}/`, lastModified: CONTENT_UPDATED, priority: t.level ? 0.8 : 0.9 }));
  return [pages[0], ...tools, ...pages.slice(1)];
}
