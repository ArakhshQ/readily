"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Item } from "./FileList";
import { MAX_FILE_BYTES, formatBytes, isAudio, isHeic, isImage, isPdf, isVideo } from "@/lib/files";
import { takeHandoff } from "@/lib/handoff";
import type { InputKind } from "@/lib/tools";

const CHECK: Record<InputKind, { test: (f: File) => boolean; label: string }> = {
  image: { test: (f) => isImage(f), label: "an image" },
  pdf: { test: isPdf, label: "a PDF" },
  "image-pdf": { test: (f) => isImage(f) || isPdf(f), label: "an image or PDF" },
  heic: { test: isHeic, label: "a HEIC photo" },
  video: { test: isVideo, label: "a video" },
  audio: { test: isAudio, label: "an audio file" },
  media: { test: (f) => isVideo(f) || isAudio(f), label: "a video or audio file" },
  text: { test: (f) => f.type.startsWith("text/") || /\.txt$/i.test(f.name), label: "a text file" },
  any: { test: (f) => isImage(f) || isPdf(f) || isHeic(f), label: "an image or PDF" },
};

let counter = 0;
const newId = () => `f${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * File state for a tool: accepts drops, rejects the wrong kind with a clear
 * message, and picks up files handed over from another page.
 */
export function useFiles(kind: InputKind, multiple: boolean) {
  const [items, setItems] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);
  const took = useRef(false);

  const add = useCallback(
    (files: File[]) => {
      const ok: File[] = [];
      const bad: string[] = [];
      for (const f of files) {
        const right = CHECK[kind].test(f);
        if (!right) bad.push(`${f.name} isn't ${CHECK[kind].label}`);
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
