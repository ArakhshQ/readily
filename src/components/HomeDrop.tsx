"use client";

// Homepage drop zone: drop any file and Readily suggests what it can do with it,
// then carries the file into that tool without another upload.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dropzone } from "./Dropzone";
import { ArrowRight, ToolGlyph } from "./Icons";
import { Message } from "./Message";
import { formatBytes, isAudio, isImage, isPdf, isVideo, isHeic } from "@/lib/files";
import { setHandoff } from "@/lib/handoff";
import { TOOL_BY_SLUG, type ToolSlug } from "@/lib/tools";

const ACCEPT = "image/*,application/pdf,.pdf,.heic,.heif,video/*,audio/*,.mp4,.mov,.webm,.mkv,.mp3,.wav,.m4a,.ogg,.flac";

type Kind = "image" | "pdf" | "video" | "audio";
function kindOf(f: File): Kind | null {
  if (isPdf(f)) return "pdf";
  if (isVideo(f)) return "video";
  if (isAudio(f)) return "audio";
  if (isImage(f)) return "image";
  return null;
}

function suggestionsFor(files: File[]): { slug: ToolSlug; why: string }[] {
  const kind = files.length ? kindOf(files[0]) : null;
  const n = files.length;
  if (kind === "pdf") {
    return n > 1
      ? [
          { slug: "merge-pdf", why: `Combine these ${n} PDFs into one` },
          { slug: "compress-pdf", why: "Make the first PDF smaller" },
        ]
      : [
          { slug: "compress-pdf", why: "Make it small enough to send or upload" },
          { slug: "sign-pdf", why: "Add your signature" },
          { slug: "organize-pdf", why: "Reorder, rotate or delete pages" },
          { slug: "split-pdf", why: "Pull out pages or split it into parts" },
          { slug: "pdf-to-jpg", why: "Save the pages as images" },
        ];
  }
  if (kind === "image") {
    const s = n > 1 ? "them" : "it";
    const heic = files.every(isHeic);
    const list: { slug: ToolSlug; why: string }[] = [
      { slug: "compress-image", why: `Make ${s} smaller than an upload limit` },
      { slug: "jpg-to-pdf", why: n > 1 ? `Put all ${n} into one PDF` : "Turn it into a PDF" },
      { slug: "resize-image", why: "Set exact width and height in pixels" },
      { slug: "image-to-text", why: "Copy the text out of it" },
    ];
    if (heic) list.unshift({ slug: "heic-to-jpg", why: "Turn iPhone photos into JPGs that open anywhere" });
    else if (n === 1) list.push({ slug: "crop-image", why: "Cut it to the shape you need" });
    return list;
  }
  if (kind === "video") {
    return [
      { slug: "compress-video", why: "Make it small enough to send" },
      { slug: "trim-video", why: "Cut the start or end" },
      { slug: "video-to-mp3", why: "Save the sound as MP3" },
    ];
  }
  if (kind === "audio") {
    return [
      { slug: "convert-audio", why: "Change it to MP3, WAV or M4A" },
      { slug: "trim-audio", why: "Keep just the part you need" },
    ];
  }
  return [];
}

export function HomeDrop() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  function take(list: File[]) {
    const usable = list.filter((f) => kindOf(f) !== null);
    if (!usable.length) {
      setProblem("Readily works with images, PDFs, videos and audio. Try a JPG, PDF, MP4 or MP3 file.");
      setFiles([]);
      return;
    }
    const first = kindOf(usable[0]);
    const same = usable.filter((f) => kindOf(f) === first);
    if (same.length < usable.length) {
      setProblem("That's a mix of file types. Readily picked the first kind; drop the others separately.");
    } else {
      setProblem(usable.length < list.length ? "Some files weren't supported, so they were left out." : null);
    }
    setFiles(same);
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
        <Dropzone accept={ACCEPT} multiple onFiles={take} title="Drop a file to start" sub="A photo, PDF, video or audio file. Readily shows what it can do with it." />
        {problem && <Message kind="note">{problem}</Message>}
      </div>
    );
  }

  return (
    <div className="suggest" aria-live="polite">
      <div className="suggest-head">
        <h2 style={{ fontSize: 20 }}>
          {files.length === 1 ? files[0].name : `${files.length} ${{ pdf: "PDFs", image: "images", video: "videos", audio: "audio files" }[kindOf(files[0]) ?? "image"]}`}
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
