"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Item } from "./FileList";
import { MAX_FILE_BYTES, formatBytes, isImage, isPdf } from "@/lib/files";
import { takeHandoff } from "@/lib/handoff";

let counter = 0;
const newId = () => `f${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * File state for a tool: accepts drops, rejects the wrong kind with a clear
 * message, and picks up files handed over from another page.
 */
export function useFiles(kind: "image" | "pdf", multiple: boolean) {
  const [items, setItems] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);
  const took = useRef(false);

  const add = useCallback(
    (files: File[]) => {
      const ok: File[] = [];
      const bad: string[] = [];
      for (const f of files) {
        const right = kind === "pdf" ? isPdf(f) : isImage(f);
        if (!right) bad.push(`${f.name} isn't ${kind === "pdf" ? "a PDF" : "an image"}`);
        else if (f.size > MAX_FILE_BYTES) bad.push(`${f.name} is larger than ${formatBytes(MAX_FILE_BYTES)}`);
        else ok.push(f);
      }
      setRejected(bad.length ? `${bad.join("; ")}. ${bad.length === 1 ? "It was" : "They were"} skipped.` : null);
      if (!ok.length) return;
      const fresh = ok.map((file) => ({ id: newId(), file }));
      setItems((prev) => (multiple ? [...prev, ...fresh] : fresh.slice(0, 1)));
    },
    [kind, multiple],
  );

  useEffect(() => {
    if (took.current) return;
    took.current = true;
    const handed = takeHandoff();
    if (handed.length) add(handed);
  }, [add]);

  const setDetail = useCallback((id: string, detail: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, detail } : it)));
  }, []);

  return { items, setItems, add, rejected, setRejected, setDetail };
}
