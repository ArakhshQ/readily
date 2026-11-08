import type { Metadata } from "next";
import { ToolDirectory } from "@/components/ToolDirectory";

export const metadata: Metadata = {
  title: "All tools",
  description: "Every Readily tool for PDFs and images: images to PDF, merge PDF, split PDF, compress, resize and convert images. Free and private.",
  alternates: { canonical: "/tools/" },
};

export default function ToolsPage() {
  return (
    <section className="section">
      <div className="wrap">
        <ToolDirectory headingLevel={1} heading="All tools" intro="Free, private, and nothing to install. Pick a tool to start." />
      </div>
    </section>
  );
}
