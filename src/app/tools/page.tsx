import type { Metadata } from "next";
import { ToolDirectory } from "@/components/ToolDirectory";

export const metadata: Metadata = {
  title: { absolute: "All Free Online File Tools – PDF, Image, Video, Audio" },
  description: "Every Readily tool: merge, split and compress PDFs, compress and resize images, video to MP3, trim audio, plus AI tools. Free, private, no sign-up.",
  alternates: { canonical: "/tools/" },
};

export default function ToolsPage() {
  return (
    <section className="section">
      <div className="wrap">
        <ToolDirectory headingLevel={1} heading="All Tools" intro="Free, private, and nothing to install. Pick a tool to start." />
      </div>
    </section>
  );
}
