"use client";

import { useRef, useState } from "react";
import { Upload } from "./Icons";

interface Props {
  accept: string;
  multiple: boolean;
  onFiles: (files: File[]) => void;
  title?: string;
  sub?: string;
  compact?: boolean;
}

export function Dropzone({ accept, multiple, onFiles, title, sub, compact }: Props) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  function take(list: FileList | null) {
    if (list && list.length) onFiles(Array.from(list));
    if (input.current) input.current.value = "";
  }

  const label = title ?? (multiple ? "Choose files" : "Choose a file");

  return (
    <div
      className={`dropzone${over ? " is-over" : ""}${compact ? " compact" : ""}`}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        take(e.dataTransfer.files);
      }}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        aria-label={label}
        onChange={(e) => take(e.target.files)}
      />
      <span className="dz-icon">
        <Upload size={compact ? 18 : 26} />
      </span>
      <span>
        <span className="dz-title">{compact ? (multiple ? "Add more files" : "Choose another file") : label}</span>
        {!compact && <span className="dz-sub" style={{ display: "block" }}>{sub ?? "or drop them here"}</span>}
      </span>
      {!compact && (
        <span className="btn btn-primary dz-btn" aria-hidden="true">
          Browse your device
        </span>
      )}
    </div>
  );
}
