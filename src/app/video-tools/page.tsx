import type { Metadata } from "next";
import { CategoryPage } from "@/components/CategoryPage";

export const metadata: Metadata = {
  title: { absolute: "Free Video Tools Online – Trim, Compress, Video to MP3" },
  description: "Free online video tools: trim video, compress MP4 files and convert video to MP3 in your browser. Plus AI subtitles, dubbing and video upscaling.",
  alternates: { canonical: "/video-tools/" },
};

export default function Page() {
  return <CategoryPage heading="Free Online Video Tools" id="video" intro="Trim, shrink and pull the sound out of videos." />;
}
