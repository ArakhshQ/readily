"use client";

// Loads only the code for the tool on the current page.
import dynamic from "next/dynamic";
import { AccessBanner, AccessProvider } from "./Access";
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
  "noise-remover": dynamic(() => import("./tools/NoiseRemover"), { ssr: false, loading }),
  "remove-background": dynamic(() => import("./tools/RemoveBackground"), { ssr: false, loading }),
  "upscale-image": dynamic(() => import("./tools/UpscaleImage"), { ssr: false, loading }),
  "object-eraser": dynamic(() => import("./tools/ObjectEraser"), { ssr: false, loading }),
  "searchable-pdf": dynamic(() => import("./tools/SearchablePdf"), { ssr: false, loading }),
  "protect-pdf": dynamic(() => import("./tools/ProtectPdf"), { ssr: false, loading }),
  "unlock-pdf": dynamic(() => import("./tools/UnlockPdf"), { ssr: false, loading }),
  "remove-silence": dynamic(() => import("./tools/RemoveSilence"), { ssr: false, loading }),
  "pdf-to-word": dynamic(() => import("./tools/PdfToWord"), { ssr: false, loading }),
  "summarize-pdf": dynamic(() => import("./tools/SummarizePdf"), { ssr: false, loading }),
  "chat-with-pdf": dynamic(() => import("./tools/ChatWithPdf"), { ssr: false, loading }),
  "transcribe": dynamic(() => import("./tools/Transcribe"), { ssr: false, loading }),
  "studio-voice": dynamic(() => import("./tools/StudioVoice"), { ssr: false, loading }),
  "auto-subtitles": dynamic(() => import("./tools/AutoSubtitles"), { ssr: false, loading }),
  "translate-document": dynamic(() => import("./tools/TranslateDocument"), { ssr: false, loading }),
  "hd-photo-upscaler": dynamic(() => import("./tools/HdPhotoUpscaler"), { ssr: false, loading }),
  "restore-photo": dynamic(() => import("./tools/RestorePhoto"), { ssr: false, loading }),
  "colorize-photo": dynamic(() => import("./tools/ColorizePhoto"), { ssr: false, loading }),
  "assistant": dynamic(() => import("./tools/Assistant"), { ssr: false, loading }),
  "ai-voiceover": dynamic(() => import("./tools/AiVoiceover"), { ssr: false, loading }),
  "voice-changer": dynamic(() => import("./tools/VoiceChanger"), { ssr: false, loading }),
  "ai-dubbing": dynamic(() => import("./tools/AiDubbing"), { ssr: false, loading }),
  "video-background-remover": dynamic(() => import("./tools/VideoBackgroundRemover"), { ssr: false, loading }),
  "video-upscaler": dynamic(() => import("./tools/VideoUpscaler"), { ssr: false, loading }),
  "photo-to-video": dynamic(() => import("./tools/PhotoToVideo"), { ssr: false, loading }),
  "ai-photo-editor": dynamic(() => import("./tools/AiPhotoEditor"), { ssr: false, loading }),
  "product-photo-backgrounds": dynamic(() => import("./tools/ProductPhotoBackgrounds"), { ssr: false, loading }),
};

export function ToolRunner({ slug }: { slug: ToolSlug }) {
  const Runner = RUNNERS[slug];
  return (
    <AccessProvider slug={slug}>
      <AccessBanner />
      <Runner />
    </AccessProvider>
  );
}
