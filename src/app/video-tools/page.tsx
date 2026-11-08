import type { Metadata } from "next";
import { CategoryPage } from "@/components/CategoryPage";

export const metadata: Metadata = {
  title: "Video tools: free and private",
  description: "Free video tools in your browser: trim video, compress video and convert video to MP3. Nothing is uploaded.",
  alternates: { canonical: "/video-tools/" },
};

export default function Page() {
  return <CategoryPage id="video" intro="Trim, shrink and pull the sound out of videos." />;
}
