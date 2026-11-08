"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Close, FileIcon } from "./Icons";
import { formatBytes, isImage } from "@/lib/files";

export interface Item {
  id: string;
  file: File;
  /** Extra detail such as page count or pixel size. */
  detail?: string;
}

function Thumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!isImage(file)) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <span className="file-thumb">
      {url && !failed ? <img src={url} alt="" onError={() => setFailed(true)} /> : <FileIcon size={22} />}
    </span>
  );
}

interface Props {
  items: Item[];
  onChange: (items: Item[]) => void;
  reorder?: boolean;
  /** Heading above the list, e.g. "Pages in your PDF". */
  heading: string;
}

export function FileList({ items, onChange, reorder = true, heading }: Props) {
  function move(i: number, d: -1 | 1) {
    const next = items.slice();
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x);
    onChange(next);
  }
  const total = items.reduce((s, it) => s + it.file.size, 0);
  return (
    <div>
      <div className="list-head">
        <p>
          {heading} <span>{items.length} {items.length === 1 ? "file" : "files"}, {formatBytes(total)}</span>
        </p>
        {items.length > 1 && (
          <button type="button" className="btn btn-quiet" onClick={() => onChange([])}>
            Remove all
          </button>
        )}
      </div>
      <ol className="file-list">
        {items.map((it, i) => (
          <li className="file-item" key={it.id}>
            <span className="order">{reorder ? i + 1 : ""}</span>
            <Thumb file={it.file} />
            <span className="file-meta">
              <strong title={it.file.name}>{it.file.name}</strong>
              <span>
                {formatBytes(it.file.size)}
                {it.detail ? `, ${it.detail}` : ""}
              </span>
            </span>
            <span className="file-actions">
              {reorder && (
                <>
                  <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${it.file.name} up`}>
                    <ArrowUp size={18} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={`Move ${it.file.name} down`}
                  >
                    <ArrowDown size={18} />
                  </button>
                </>
              )}
              <button type="button" className="icon-btn" onClick={() => onChange(items.filter((x) => x.id !== it.id))} aria-label={`Remove ${it.file.name}`}>
                <Close size={18} />
              </button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
