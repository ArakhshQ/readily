import type { Metadata } from "next";
import { CategoryPage } from "@/components/CategoryPage";

export const metadata: Metadata = {
  title: { absolute: "Free Image Tools Online – Compress, Resize, Convert, Crop" },
  description: "Free online image tools: compress images to 100KB, resize to exact pixels, crop, convert PNG to JPG, HEIC to JPG and image to text. No upload, no sign-up.",
  alternates: { canonical: "/image-tools/" },
};

export default function Page() {
  return <CategoryPage heading="Free Online Image Tools" id="image" intro="Get photos to the exact size, shape and format you need." />;
}
