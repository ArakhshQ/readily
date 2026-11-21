import type { ToolSlug } from "../tools";
import { EXTRA_FAQ, EXTRA_SECTIONS } from "./extra";
import { IMAGE_GUIDES } from "./image";
import { MEDIA_GUIDES } from "./media";
import { PDF_GUIDES } from "./pdf";
import type { Guide } from "./types";

export type { Guide, GuideSection } from "./types";

const ALL = { ...PDF_GUIDES, ...IMAGE_GUIDES, ...MEDIA_GUIDES };

/** The written guide for a tool page, with any extra sections and questions merged in. */
export function guideFor(slug: ToolSlug): Guide | undefined {
  const g = ALL[slug];
  if (!g) return undefined;
  return { ...g, sections: [...g.sections, ...(EXTRA_SECTIONS[slug] ?? [])], faq: [...(g.faq ?? []), ...(EXTRA_FAQ[slug] ?? [])] };
}

/** When the tool pages' written content last changed (used for the sitemap's dates). */
export const CONTENT_UPDATED = "2026-11-21";
/** When the other public pages last changed. */
export const PAGES_UPDATED = "2026-11-21";
