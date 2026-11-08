import type { Metadata } from "next";
import { CategoryPage } from "@/components/CategoryPage";

export const metadata: Metadata = {
  title: "Image tools: free and private",
  description: "Free image tools in your browser: compress to an exact size, resize, crop, convert, HEIC to JPG and image to text. No upload.",
  alternates: { canonical: "/image-tools/" },
};

export default function Page() {
  return <CategoryPage id="image" intro="Get photos to the exact size, shape and format you need." />;
}
