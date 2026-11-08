import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ["", "tools/", "about/", "privacy/", "terms/"].map((p) => ({
    url: `${SITE.url}/${p}`,
    lastModified: now,
    priority: p === "" ? 1 : 0.4,
  }));
  const tools = TOOLS.map((t) => ({ url: `${SITE.url}/${t.slug}/`, lastModified: now, priority: 0.9 }));
  return [...pages.slice(0, 1), ...tools, ...pages.slice(1)];
}
