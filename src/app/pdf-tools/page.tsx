import type { Metadata } from "next";
import { CategoryPage } from "@/components/CategoryPage";

export const metadata: Metadata = {
  title: "PDF tools: free and private",
  description: "Free PDF tools that run in your browser: images to PDF, merge, split, compress, organize, number, watermark and sign PDFs. No upload.",
  alternates: { canonical: "/pdf-tools/" },
};

export default function Page() {
  return <CategoryPage id="pdf" intro="Build, combine, edit and sign PDFs." />;
}
