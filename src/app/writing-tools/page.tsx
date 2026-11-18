import type { Metadata } from "next";
import { CategoryPage } from "@/components/CategoryPage";

export const metadata: Metadata = {
  title: { absolute: "AI Writing Tools – Grammar Checker and Paraphrasing Tool" },
  description: "AI writing tools: check grammar, spelling and punctuation with every fix explained, and paraphrase text to be simpler, shorter, more formal or friendlier.",
  alternates: { canonical: "/writing-tools/" },
};

export default function Page() {
  return <CategoryPage heading="AI Writing Tools" id="text" intro="Fix mistakes and rewrite emails, essays and applications." />;
}
