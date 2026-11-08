"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Download, Refresh } from "./Icons";
import { Message } from "./Message";
import { downloadBlob, zipOutputs, type Output } from "@/lib/files";
import { blobToFile, setHandoff } from "@/lib/handoff";
import { TOOL_BY_SLUG, type ToolSlug } from "@/lib/tools";

interface Props {
  outputs: Output[];
  /** Name for the ZIP when there is more than one file. */
  zipName: string;
  /** Tools that can take these results as input. */
  next: ToolSlug[];
  onRestart: () => void;
}

export function ResultPanel({ outputs, zipName, next, onRestart }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  async function downloadAll() {
    setZipping(true);
    try {
      const z = await zipOutputs(outputs, zipName);
      downloadBlob(z.blob, z.name);
    } finally {
      setZipping(false);
    }
  }

  function sendTo(slug: ToolSlug) {
    setHandoff(outputs.map((o) => blobToFile(o.blob, o.name)));
    router.push(`/${slug}/`);
  }

  const many = outputs.length > 1;

  return (
    <div className="result" ref={ref} tabIndex={-1} aria-live="polite">
      <div className="result-head">
        <span className="tick">
          <Check size={20} strokeWidth={3} />
        </span>
        <div>
          <h2>{many ? `${outputs.length} files ready` : "Your file is ready"}</h2>
          <p>Made on your device. Nothing was uploaded.</p>
        </div>
      </div>
      <ul className="result-files">
        {outputs.map((o, i) => (
          <li className="result-file" key={`${o.name}-${i}`}>
            <div>
              <strong>{o.name}</strong>
              <ul className="checks">
                {o.checks.map((c) => (
                  <li key={c}>
                    <Check size={15} strokeWidth={3} />
                    {c}
                  </li>
                ))}
              </ul>
              {o.note && <Message kind="note">{o.note}</Message>}
            </div>
            <button type="button" className={`btn ${many ? "btn-secondary" : "btn-primary"}`} onClick={() => downloadBlob(o.blob, o.name)}>
              <Download size={18} />
              Download
            </button>
          </li>
        ))}
      </ul>
      <div className="result-foot">
        {many && (
          <button type="button" className="btn btn-primary" onClick={downloadAll} disabled={zipping}>
            <Download size={18} />
            {zipping ? "Preparing ZIP" : "Download all as ZIP"}
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onRestart}>
          <Refresh size={18} />
          Start over
        </button>
        {next.length > 0 && (
          <>
            <span className="next-label">Keep going with {many ? "these files" : "this file"}</span>
            {next.map((slug) => (
              <button key={slug} type="button" className="btn btn-secondary" onClick={() => sendTo(slug)}>
                {TOOL_BY_SLUG[slug].name}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
