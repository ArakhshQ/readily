"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { Check, Cloud, Copy, Download, Refresh } from "./Icons";
import { Message } from "./Message";
import { downloadBlob, zipOutputs, type Output } from "@/lib/files";
import { blobToFile, setHandoff } from "@/lib/handoff";
import { TOOL_BY_SLUG, type ToolSlug } from "@/lib/tools";

interface Props {
  /** The tool that made these results, for history and saved files. */
  tool: ToolSlug;
  outputs: Output[];
  /** Name for the ZIP when there is more than one file. */
  zipName: string;
  /** Tools that can take these results as input. */
  next: ToolSlug[];
  onRestart: () => void;
}

type SaveState = "idle" | "saving" | "saved" | string;

export function ResultPanel({ tool, outputs, zipName, next, onRestart }: Props) {
  const { enabled, session } = useAuth();
  const [saves, setSaves] = useState<Record<number, SaveState>>({});
  const logged = useRef(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [zipping, setZipping] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.dispatchEvent(new CustomEvent("readily:result", { detail: { tool } }));
  }, [tool]);

  // Signed-in users get a history entry: names and sizes only, never the files.
  useEffect(() => {
    if (!session || logged.current) return;
    logged.current = true;
    import("@/lib/account")
      .then(({ addHistory }) => addHistory(tool, outputs.map((o) => ({ name: o.name, size: o.blob.size }))))
      .catch(() => {});
  }, [session, tool, outputs]);

  async function save(i: number) {
    setSaves((s) => ({ ...s, [i]: "saving" }));
    try {
      const { saveFile } = await import("@/lib/account");
      await saveFile(outputs[i].blob, outputs[i].name, tool);
      setSaves((s) => ({ ...s, [i]: "saved" }));
    } catch (e) {
      setSaves((s) => ({ ...s, [i]: e instanceof Error ? e.message : "Couldn't save this file." }));
    }
  }

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
              {o.preview !== undefined && o.preview.length > 0 && (
                <div className="text-preview">
                  <textarea readOnly value={o.preview} aria-label="Recognized text" rows={10} />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(o.preview ?? "");
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        setCopied(false);
                      }
                    }}
                  >
                    <Copy size={18} />
                    {copied ? "Copied" : "Copy text"}
                  </button>
                </div>
              )}
            </div>
            <div className="result-actions">
              <button type="button" className={`btn ${many ? "btn-secondary" : "btn-primary"}`} onClick={() => downloadBlob(o.blob, o.name)}>
                <Download size={18} />
                Download
              </button>
              {session && (
                <button type="button" className="btn btn-secondary" disabled={saves[i] === "saving" || saves[i] === "saved"} onClick={() => save(i)}>
                  {saves[i] === "saved" ? <Check size={18} strokeWidth={3} /> : <Cloud size={18} />}
                  {saves[i] === "saving" ? "Saving" : saves[i] === "saved" ? "Saved" : "Save to my files"}
                </button>
              )}
              {saves[i] && !["idle", "saving", "saved"].includes(saves[i]) && <p className="save-error">{saves[i]}</p>}
            </div>
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
        {enabled && !session && (
          <p className="save-hint">
            <Cloud size={16} /> <Link href="/signup/">Sign up free</Link> to save results and see your history on any device.
          </p>
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
