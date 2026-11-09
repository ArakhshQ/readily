// Claude for summaries, questions, translation and plain-words commands.
import { HttpError, env } from "./http.ts";

export const MODEL_FAST = () => Deno.env.get("ANTHROPIC_MODEL_FAST") ?? "claude-haiku-5-5";
export const MODEL_BEST = () => Deno.env.get("ANTHROPIC_MODEL_BEST") ?? "claude-sonnet-5-5";

export async function claude(opts: { model: string; system: string; user: string; maxTokens: number; temperature?: number }): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature ?? 0.2,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429 || res.status === 529) throw new HttpError(503, "The AI is very busy right now. Try again in a minute.");
    throw new HttpError(502, `The AI couldn't answer (${res.status}). ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = (data.content ?? []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("");
  if (!text.trim()) throw new HttpError(502, "The AI returned an empty answer. Try again.");
  return text.trim();
}

const LANG_RULE = (lang?: string) => (lang ? `Write in ${lang}.` : "Write in the same language as the document.");

export function summarizePrompt(text: string, length: "short" | "detailed", lang?: string) {
  return {
    system: `You summarize documents for busy people. ${LANG_RULE(lang)} Use plain words. Start with a one-sentence overview, then ${
      length === "short" ? "3 to 6 bullet points with the key points" : "a structured summary with short headings and bullet points covering every important point, figure, date, obligation and decision"
    }. Mention page numbers like (p. 4) when the text has [Page N] markers. Never invent facts that aren't in the document.`,
    user: `Summarize this document:\n\n${text}`,
    maxTokens: length === "short" ? 900 : 2500,
  };
}

export function questionPrompt(text: string, question: string) {
  return {
    system:
      "You answer questions about the document the user provides. Answer only from the document. Quote or cite the page, like (p. 12), using the [Page N] markers. If the document doesn't contain the answer, say so plainly. Answer in the language of the question. Be concise.",
    user: `Document:\n\n${text}\n\n---\nQuestion: ${question}`,
    maxTokens: 1200,
  };
}

export function translatePrompt(text: string, target: string) {
  return {
    system: `You are a professional translator. Translate the user's text into ${target}. Keep the meaning, tone, names, numbers and formatting (headings, lists, line breaks). Output only the translation, with no notes or explanations.`,
    user: text,
    maxTokens: Math.min(16000, Math.ceil(text.length / 2) + 1000),
  };
}

export const ASSISTANT_STEPS = `Available steps (run in order, each takes the previous step's files):
- {"op":"images_to_pdf","page":"a4"|"letter"|"fit"}  combine images into one PDF
- {"op":"merge_pdfs"}  join PDFs into one
- {"op":"compress_pdf","level":"balanced"|"strong"}
- {"op":"compress_image","target_kb":number}  shrink each image under a size
- {"op":"pdf_under_size","target_kb":number}  compress a PDF until it's under a size
- {"op":"resize_image","width":number|null,"height":number|null}  keep aspect if one is null
- {"op":"convert_image","format":"jpg"|"png"|"webp"}
- {"op":"heic_to_jpg"}
- {"op":"split_pdf","ranges":"1-3,5"}  extract pages
- {"op":"pdf_to_images","format":"jpg"|"png"}
- {"op":"rotate_pdf","degrees":90|180|270}
- {"op":"add_page_numbers"}
- {"op":"rename","name":"text"}  set the output file name (without extension)`;

export function assistantPrompt(request: string, files: { name: string; type: string; size: number }[]) {
  return {
    system: `You turn a user's plain-words request about their files into steps for Readily, a file tool.
${ASSISTANT_STEPS}
Reply with JSON only: {"steps":[...],"reply":"one short sentence telling the user what you'll do"}.
If the request can't be done with these steps, reply {"steps":[],"reply":"a short, friendly explanation and a suggestion"}.
Sizes: "2 MB" = 2000 kb. Never invent steps that aren't listed.`,
    user: `Files: ${JSON.stringify(files.slice(0, 50))}\nRequest: ${request}`,
    maxTokens: 600,
  };
}
