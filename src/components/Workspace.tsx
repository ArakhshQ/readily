"use client";

// The frame every tool shares: drop zone first, then files, options, the
// action button, and finally the result with its readiness check.
import { Dropzone } from "./Dropzone";
import { FileList, type Item } from "./FileList";
import { Message, Progress } from "./Message";
import { ResultPanel } from "./ResultPanel";
import type { Output } from "@/lib/files";
import type { Tool, ToolSlug } from "@/lib/tools";

interface Props {
  tool: Tool;
  items: Item[];
  setItems: (items: Item[]) => void;
  add: (files: File[]) => void;
  rejected: string | null;
  listHeading: string;
  reorder?: boolean;
  options?: React.ReactNode;
  actionLabel: string;
  busyLabel: string;
  canRun: boolean;
  blockedReason?: string;
  summary?: string;
  onRun: () => void;
  busy: boolean;
  progress: number;
  /** Optional live message while working, e.g. "Reading page 2 of 5". */
  status?: string | null;
  /** Shown instead of the file list (custom editors like page grids). */
  hideList?: boolean;
  error: string | null;
  outputs: Output[] | null;
  zipName: string;
  next: ToolSlug[];
  onRestart: () => void;
}

export function Workspace(p: Props) {
  const empty = p.items.length === 0;
  return (
    <div className="workspace">
      {empty ? (
        <Dropzone
          accept={p.tool.accept}
          multiple={p.tool.multiple}
          onFiles={p.add}
          title={p.tool.multiple ? "Choose files" : "Choose a file"}
          sub={`${p.tool.acceptLabel}, or drop ${p.tool.multiple ? "them" : "it"} here`}
        />
      ) : (
        <>
          {!p.hideList && <FileList heading={p.listHeading} items={p.items} onChange={p.setItems} reorder={p.reorder} />}
          <Dropzone compact accept={p.tool.accept} multiple={p.tool.multiple} onFiles={p.add} />
        </>
      )}

      {p.rejected && <Message kind="note">{p.rejected}</Message>}

      {!empty && p.options && <div className="options">{p.options}</div>}

      {!empty && !p.outputs && (
        <div className="action-bar">
          <button type="button" className="btn btn-primary" disabled={!p.canRun || p.busy} onClick={p.onRun}>
            {p.busy ? p.busyLabel : p.actionLabel}
          </button>
          {(p.blockedReason || p.summary) && <span className="summary">{!p.canRun && p.blockedReason ? p.blockedReason : p.summary}</span>}
        </div>
      )}

      {p.busy && (
        <div style={{ display: "grid", gap: 8 }}>
          <Progress value={p.progress} label={p.status || p.busyLabel} />
          <p className="status-line">
            {p.status || p.busyLabel}
            {p.progress > 0 && p.progress < 1 ? ` · ${Math.round(p.progress * 100)}%` : ""}
          </p>
        </div>
      )}
      {p.error && <Message kind="error">{p.error}</Message>}
      {p.outputs && <ResultPanel outputs={p.outputs} zipName={p.zipName} next={p.next} onRestart={p.onRestart} />}
    </div>
  );
}
