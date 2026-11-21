import type { ToolSlug } from "../tools";

export interface GuideSection {
  h: string;
  p: string[];
  /** Optional bullet points shown after the paragraphs. */
  list?: string[];
}

/** The written part of a tool page: how to use it, and what people need to know. */
export interface Guide {
  /** Heading for the steps, phrased the way people search ("How to trim audio online"). */
  howTo: string;
  steps: string[];
  sections: GuideSection[];
  /** Extra questions, shown after the tool's own. */
  faq?: { q: string; a: string }[];
}

export type Guides = Partial<Record<ToolSlug, Guide>>;
