import type { Metadata } from "next";
import { CategoryPage } from "@/components/CategoryPage";

export const metadata: Metadata = {
  title: "Audio tools: free and private",
  description: "Free audio tools in your browser: convert audio to MP3, WAV or M4A and trim songs and recordings. Nothing is uploaded.",
  alternates: { canonical: "/audio-tools/" },
};

export default function Page() {
  return <CategoryPage id="audio" intro="Convert and cut songs, voice notes and recordings." />;
}
