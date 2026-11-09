"use client";

import { useState } from "react";
import { useAccess } from "../Access";
import { Segmented } from "../Segmented";
import { ServerTool } from "../ServerTool";
import { baseName, formatBytes } from "@/lib/files";

const LANGS = [
  "English", "Persian", "Dari", "Pashto", "Arabic", "Urdu", "Turkish", "French", "Spanish", "German", "Italian", "Portuguese",
  "Russian", "Ukrainian", "Chinese (Simplified)", "Chinese (Traditional)", "Japanese", "Korean", "Hindi", "Bengali", "Indonesian",
  "Malay", "Vietnamese", "Thai", "Dutch", "Polish", "Swedish", "Norwegian", "Danish", "Finnish", "Greek", "Czech", "Romanian",
  "Hungarian", "Hebrew", "Swahili", "Tajik", "Uzbek", "Kazakh", "Azerbaijani", "Kurdish (Sorani)", "Filipino",
];

export default function TranslateDocument() {
  const access = useAccess();
  const premium = access.plan === "premium";
  const [target, setTarget] = useState("English");
  const [quality, setQuality] = useState<"standard" | "best">("standard");
  const best = quality === "best";
  return (
    <ServerTool
      slug="translate-document"
      input="pdf"
      best={best}
      deps={[target, quality]}
      ready={{ ok: !best || premium, why: "Best quality is part of Premium" }}
      options={
        <>
          <div className="field">
            <label className="field-label" htmlFor="tl">
              Translate into
            </label>
            <select id="tl" className="input" style={{ maxWidth: 320 }} value={target} onChange={(e) => setTarget(e.target.value)}>
              {LANGS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <Segmented
            legend="Quality"
            name="q"
            value={quality}
            onChange={setQuality}
            hint={best ? "A stronger AI model: better with tone, idioms and technical terms. 3 credits per page (Premium)." : "Fast and accurate for everyday documents. 1 credit per page."}
            options={[
              { value: "standard", label: "Standard" },
              { value: "best", label: premium ? "Best quality" : "Best quality (Premium)" },
            ]}
          />
        </>
      }
      measure={async (file) => {
        const { documentText } = await import("@/lib/ai-tools");
        const d = await documentText(file);
        return { pages: Math.max(1, Math.ceil(d.text.replace(/\[Page \d+\]\n?/g, "").length / 3000)) };
      }}
      actionLabel="Translate"
      busyLabel="Translating"
      work={async (file, _m, report) => {
        const { documentText, chunkText, serverRun, textToDocx, isRtlLanguage } = await import("@/lib/ai-tools");
        const { text } = await documentText(file, (p, l) => report(p * 0.1, l));
        const clean = text.replace(/\[Page \d+\]\n?/g, "").trim();
        const parts = chunkText(clean, 12_000);
        const out: string[] = [];
        let used = 0;
        let left: number | undefined;
        for (let i = 0; i < parts.length; i++) {
          const res = await serverRun("translate-document", { payload: { text: parts[i], target, quality } }, (p, l) => report(0.1 + ((i + p) / parts.length) * 0.85, l), `Translating part ${i + 1} of ${parts.length}`);
          out.push(res.text ?? "");
          used += res.credits_used ?? 0;
          left = res.credits_left;
        }
        const translated = out.join("\n\n");
        const base = `${baseName(file.name)} (${target})`;
        const docx = await textToDocx(translated, base, isRtlLanguage(target));
        const note = `${used} credits used${left !== undefined ? `, ${left.toLocaleString("en-US")} left` : ""}`;
        const txt = new Blob([translated], { type: "text/plain;charset=utf-8" });
        return {
          res: { job: "", status: "succeeded", credits_left: left, credits_used: used },
          outputs: [
            { blob: docx, name: `${base}.docx`, checks: [`Translated into ${target}`, best ? "Best quality" : "Standard quality", note, formatBytes(docx.size)], preview: translated },
            { blob: txt, name: `${base}.txt`, checks: ["Plain text", formatBytes(txt.size)] },
          ],
        };
      }}
      next={["pdf-to-word", "summarize-pdf"]}
    />
  );
}
