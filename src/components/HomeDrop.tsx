"use client";

// Homepage drop zone: drop any file and Readily suggests what it can do with it,
// then carries the file into that tool without another upload.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dropzone } from "./Dropzone";
import { ArrowRight, ToolGlyph } from "./Icons";
import { Message } from "./Message";
import { formatBytes, isImage, isPdf } from "@/lib/files";
import { setHandoff } from "@/lib/handoff";
import { TOOL_BY_SLUG, type ToolSlug } from "@/lib/tools";

const ACCEPT = "image/*,application/pdf,.pdf,.heic,.heif";

function suggestionsFor(files: File[]): { slug: ToolSlug; why: string }[] {
  const imgs = files.filter(isImage).length;
  const pdfs = files.filter(isPdf).length;
  if (pdfs && !imgs) {
    return pdfs > 1
      ? [
          { slug: "merge-pdf", why: `Combine these ${pdfs} PDFs into one` },
          { slug: "split-pdf", why: "Pull pages out of the first PDF" },
        ]
      : [
          { slug: "split-pdf", why: "Pull out pages or split it into parts" },
          { slug: "merge-pdf", why: "Add more PDFs and combine them" },
        ];
  }
  if (imgs && !pdfs) {
    const s = imgs > 1 ? "them" : "it";
    return [
      { slug: "compress-image", why: `Make ${s} smaller than an upload limit` },
      { slug: "jpg-to-pdf", why: imgs > 1 ? `Put all ${imgs} into one PDF` : "Turn it into a PDF" },
      { slug: "resize-image", why: "Set exact width and height in pixels" },
      { slug: "convert-image", why: "Change to JPG, PNG or WebP" },
    ];
  }
  return [];
}

export function HomeDrop() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  function take(list: File[]) {
    const usable = list.filter((f) => isImage(f) || isPdf(f));
    const imgs = usable.filter(isImage);
    const pdfs = usable.filter(isPdf);
    if (!usable.length) {
      setProblem("Readily works with images and PDFs for now. Try a JPG, PNG, WebP or PDF file.");
      setFiles([]);
      return;
    }
    if (imgs.length && pdfs.length) {
      setProblem("That's a mix of images and PDFs. Drop one kind at a time, or turn the images into a PDF first.");
      setFiles(imgs);
      return;
    }
    setProblem(usable.length < list.length ? "Some files weren't images or PDFs, so they were left out." : null);
    setFiles(usable);
  }

  function open(slug: ToolSlug) {
    setHandoff(files);
    router.push(`/${slug}/`);
  }

  const suggestions = suggestionsFor(files);
  const total = files.reduce((s, f) => s + f.size, 0);

  if (!files.length) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <Dropzone accept={ACCEPT} multiple onFiles={take} title="Drop a file to start" sub="An image or PDF. Readily shows what it can do with it." />
        {problem && <Message kind="note">{problem}</Message>}
      </div>
    );
  }

  return (
    <div className="suggest" aria-live="polite">
      <div className="suggest-head">
        <h2 style={{ fontSize: 20 }}>
          {files.length === 1 ? files[0].name : `${files.length} ${isPdf(files[0]) ? "PDFs" : "images"}`}
        </h2>
        <p>{formatBytes(total)}</p>
      </div>
      {problem && (
        <div style={{ marginBottom: 12 }}>
          <Message kind="note">{problem}</Message>
        </div>
      )}
      <p style={{ fontWeight: 700, marginBottom: 10 }}>What do you need?</p>
      <div className="suggest-list">
        {suggestions.map((s) => (
          <button key={s.slug} type="button" className="suggest-item" onClick={() => open(s.slug)}>
            <span className="tool-glyph">
              <ToolGlyph slug={s.slug} />
            </span>
            <span style={{ flex: 1 }}>
              <strong>{TOOL_BY_SLUG[s.slug].name}</strong>
              <span>{s.why}</span>
            </span>
            <ArrowRight size={18} />
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-quiet" style={{ marginTop: 10 }} onClick={() => setFiles([])}>
        Choose different files
      </button>
    </div>
  );
}
