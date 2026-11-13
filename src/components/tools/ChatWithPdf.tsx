"use client";

import { useEffect, useRef, useState } from "react";
import { useAccess } from "../Access";
import { Dropzone } from "../Dropzone";
import { Download, Refresh } from "../Icons";
import { ToolErrorMessage } from "../ToolErrorMessage";
import { Message } from "../Message";
import { useFiles } from "../useFiles";
import { baseName, downloadBlob } from "@/lib/files";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["chat-with-pdf"];
type Turn = { q: string; a: string };

export default function ChatWithPdf() {
  const f = useFiles("pdf", false);
  const access = useAccess();
  const [doc, setDoc] = useState<{ text: string; pages: number } | null>(null);
  const [reading, setReading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const item = f.items[0];

  useEffect(() => {
    setDoc(null);
    setTurns([]);
    setError(null);
    if (!item) return;
    setReading(true);
    import("@/lib/ai-tools")
      .then(({ documentText }) => documentText(item.file))
      .then(setDoc)
      .catch((e) => setError(e instanceof Error ? e.message : "This file couldn't be read."))
      .finally(() => setReading(false));
  }, [item]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, busy]);

  const cost = doc ? Math.max(1, Math.ceil(doc.text.length / 100_000)) : 1;

  async function ask(e?: React.FormEvent) {
    e?.preventDefault();
    const question = q.trim();
    if (!doc || !question || busy) return;
    if (!(await access.allow())) return;
    setBusy(true);
    setError(null);
    try {
      const { runAi } = await import("@/lib/ai-client");
      const res = await runAi("chat-with-pdf", { text: doc.text, question });
      setTurns((t) => [...t, { q: question, a: res.text ?? "" }]);
      setQ("");
      if (res.credits_left !== undefined) access.setCredits(res.credits_left);
      window.dispatchEvent(new CustomEvent("readily:result", { detail: { tool: tool.slug } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The question couldn't be answered.");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const text = turns.map((t) => `Q: ${t.q}\n\nA: ${t.a}`).join("\n\n---\n\n");
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${baseName(item.file.name)} (questions).txt`);
  }

  if (!item) {
    return (
      <div className="workspace">
        <Dropzone accept={tool.accept} multiple={false} onFiles={f.add} title="Choose a file" sub={`${tool.acceptLabel}, or drop it here`} />
        {f.rejected && <Message kind="note">{f.rejected}</Message>}
      </div>
    );
  }

  return (
    <div className="workspace chat">
      <div className="chat-file">
        <strong>{item.file.name}</strong>
        <span>{reading ? "Reading…" : doc ? `${doc.pages} ${doc.pages === 1 ? "page" : "pages"} · ${cost} ${cost === 1 ? "credit" : "credits"} per question` : ""}</span>
        <button type="button" className="btn btn-quiet btn-small" onClick={() => f.setItems([])}>
          <Refresh size={16} /> Another file
        </button>
      </div>
      <div className="chat-thread" aria-live="polite">
        {turns.length === 0 && doc && <p className="hint">Ask anything: “What are the deadlines?”, “Summarize section 3”, “Who are the parties?”</p>}
        {turns.map((t, i) => (
          <div key={i} className="chat-turn">
            <p className="chat-q">{t.q}</p>
            <div className="chat-a">{t.a}</div>
          </div>
        ))}
        {busy && <p className="chat-a chat-wait">Reading the document…</p>}
        <div ref={end} />
      </div>
      {error && <ToolErrorMessage text={error} files={item ? [item.file] : undefined} />}
      <form className="chat-ask" onSubmit={ask}>
        <label className="sr-only" htmlFor="question">
          Your question
        </label>
        <input id="question" className="input" value={q} maxLength={1000} placeholder="Ask a question about this document" onChange={(e) => setQ(e.target.value)} disabled={!doc} />
        <button type="submit" className="btn btn-primary" disabled={!doc || !q.trim() || busy}>
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>
      {turns.length > 0 && (
        <button type="button" className="btn btn-secondary btn-small" onClick={save}>
          <Download size={16} /> Download the questions and answers
        </button>
      )}
    </div>
  );
}
