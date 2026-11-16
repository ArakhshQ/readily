import type { Metadata } from "next";
import { CategoryPage } from "@/components/CategoryPage";

export const metadata: Metadata = {
  title: { absolute: "Free Audio Tools Online – Audio Converter and MP3 Cutter" },
  description: "Free online audio tools: convert WAV, M4A and MP3, cut songs and make ringtones in your browser. Plus AI noise removal, transcription and voiceovers.",
  alternates: { canonical: "/audio-tools/" },
};

export default function Page() {
  return <CategoryPage heading="Free Online Audio Tools" id="audio" intro="Convert and cut songs, voice notes and recordings." />;
}
