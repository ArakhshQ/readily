import type { Metadata } from "next";
import { CategoryPage } from "@/components/CategoryPage";

export const metadata: Metadata = {
  title: { absolute: "Free PDF Tools Online – Merge, Compress, Convert, Sign" },
  description: "Free online PDF tools: merge PDF, split PDF, compress PDF, PDF to JPG, JPG to PDF, organize, number, watermark and sign PDFs. No upload, no sign-up.",
  alternates: { canonical: "/pdf-tools/" },
};

export default function Page() {
  return <CategoryPage heading="Free Online PDF Tools" id="pdf" intro="Build, combine, edit and sign PDFs." />;
}
