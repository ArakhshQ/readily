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
  "compress-pdf": dynamic(() => import("./tools/CompressPdf"), { ssr: false, loading }),
  "pdf-to-jpg": dynamic(() => import("./tools/PdfToJpg"), { ssr: false, loading }),
  "organize-pdf": dynamic(() => import("./tools/OrganizePdf"), { ssr: false, loading }),
  "add-page-numbers": dynamic(() => import("./tools/AddPageNumbers"), { ssr: false, loading }),
  "watermark-pdf": dynamic(() => import("./tools/WatermarkPdf"), { ssr: false, loading }),
  "sign-pdf": dynamic(() => import("./tools/SignPdf"), { ssr: false, loading }),
  "heic-to-jpg": dynamic(() => import("./tools/HeicToJpg"), { ssr: false, loading }),
  "crop-image": dynamic(() => import("./tools/CropImage"), { ssr: false, loading }),
  "image-to-text": dynamic(() => import("./tools/ImageToText"), { ssr: false, loading }),
  "trim-video": dynamic(() => import("./tools/TrimVideo"), { ssr: false, loading }),
  "compress-video": dynamic(() => import("./tools/CompressVideo"), { ssr: false, loading }),
  "video-to-mp3": dynamic(() => import("./tools/VideoToMp3"), { ssr: false, loading }),
  "convert-audio": dynamic(() => import("./tools/ConvertAudio"), { ssr: false, loading }),
  "trim-audio": dynamic(() => import("./tools/TrimAudio"), { ssr: false, loading }),
};

export function ToolRunner({ slug }: { slug: ToolSlug }) {
  const Runner = RUNNERS[slug];
  return <Runner />;
}
