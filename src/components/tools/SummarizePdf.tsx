"use client";

import { useState } from "react";
import { Segmented } from "../Segmented";
import { ServerTool } from "../ServerTool";
import { baseName } from "@/lib/files";

const LANGS = ["Same as the document", "English", "Persian", "Pashto", "Arabic", "Urdu", "Turkish", "French", "Spanish", "German"];

export default function SummarizePdf() {
  const [length, setLength] = useState<"short" | "detailed">("short");
  const [lang, setLang] = useState(LANGS[0]);
  return (
    <ServerTool
      slug="summarize-pdf"
      input="pdf"
      deps={[length, lang]}
      options={
        <>
          <Segmented
            legend="Summary"
            name="len"
            value={length}
            onChange={setLength}
            options={[
              { value: "short", label: "Short: key points" },
              { value: "detailed", label: "Detailed" },
            ]}
          />
          <div className="field">
            <label className="field-label" htmlFor="slang">
              Write the summary in
            </label>
            <select id="slang" className="input" style={{ maxWidth: 320 }} value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        </>
      }
      measure={async (file) => {
        const { documentText } = await import("@/lib/ai-tools");
        const d = await documentText(file);
        return { pages: d.pages };
      }}
      actionLabel="Summarize"
      busyLabel="Summarizing"
      work={async (file, _m, report) => {
        const { documentText, serverRun, textOutput, creditNote } = await import("@/lib/ai-tools");
        const { text } = await documentText(file, (p, l) => report(p * 0.2, l));
        const res = await serverRun("summarize-pdf", { payload: { text, length, language: lang === LANGS[0] ? undefined : lang } }, report, "Writing your summary");
        return { res, outputs: [textOutput(res.text ?? "", `${baseName(file.name)} (summary).txt`, [length === "short" ? "Short summary" : "Detailed summary", creditNote(res)])] };
      }}
      next={["chat-with-pdf", "translate-document"]}
    />
  );
}
