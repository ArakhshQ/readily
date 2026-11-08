"use client";

// Loads only the code for the tool on the current page.
import dynamic from "next/dynamic";
import type { ToolSlug } from "@/lib/tools";

const loading = () => <div className="workspace" style={{ minHeight: 280 }} aria-busy="true" />;

const RUNNERS: Record<ToolSlug, React.ComponentType> = {
  "jpg-to-pdf": dynamic(() => import("./tools/ImagesToPdf"), { ssr: false, loading }),
  "merge-pdf": dynamic(() => import("./tools/MergePdf"), { ssr: false, loading }),
  "split-pdf": dynamic(() => import("./tools/SplitPdf"), { ssr: false, loading }),
  "compress-image": dynamic(() => import("./tools/CompressImage"), { ssr: false, loading }),
  "resize-image": dynamic(() => import("./tools/ResizeImage"), { ssr: false, loading }),
  "convert-image": dynamic(() => import("./tools/ConvertImage"), { ssr: false, loading }),
};

export function ToolRunner({ slug }: { slug: ToolSlug }) {
  const Runner = RUNNERS[slug];
  return <Runner />;
}
