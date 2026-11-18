"use client";

// The Workspace: drop one file and every tool for it is right there. Each tool runs
// with the current file already loaded; its result becomes the next version, so
// steps can be chained (compress, then add text, then remove the background…),
// undone, and downloaded at the end. Paid tools show their plan and free try.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AccessBanner, AccessProvider } from "../Access";
import { Dropzone } from "../Dropzone";
import { ArrowLeft, Check, Download, RotateCcw, ToolGlyph } from "../Icons";
import { PlanTag } from "../PlanTag";
import { RUNNERS } from "../ToolRunner";
import { EmbedContext, type Embed } from "@/lib/embed";
import { downloadBlob, formatBytes, formatTime, isAudio, isImage, isPdf, type Output } from "@/lib/files";
import { blobToFile, setHandoff, takeHandoff } from "@/lib/handoff";
import { TOOL_BY_SLUG, toolLevel, type ToolSlug } from "@/lib/tools";

export type Kind = "image" | "pdf" | "video" | "audio";

const KIND_NAME: Record<Kind, string> = { image: "image", pdf: "PDF", video: "video", audio: "audio" };

/** Tools offered for each kind of file, in the order people usually need them. */
const TOOLSETS: Record<Kind, { edit: ToolSlug[]; ai: ToolSlug[] }> = {
  image: {
    edit: ["compress-image", "resize-image", "crop-image", "add-text-to-image", "convert-image", "jpg-to-pdf", "image-to-text"],
    ai: ["remove-background", "upscale-image", "object-eraser", "restore-photo", "colorize-photo", "hd-photo-upscaler", "ai-photo-editor", "product-photo-backgrounds", "photo-to-video"],
  },
  pdf: {
    edit: ["compress-pdf", "organize-pdf", "merge-pdf", "split-pdf", "add-page-numbers", "watermark-pdf", "sign-pdf", "pdf-to-jpg"],
    ai: ["pdf-to-word", "summarize-pdf", "chat-with-pdf", "translate-document", "searchable-pdf", "protect-pdf", "unlock-pdf"],
  },
  video: {
    edit: ["trim-video", "compress-video", "resize-video", "merge-videos", "video-to-mp3"],
    ai: ["auto-subtitles", "noise-remover", "studio-voice", "remove-silence", "transcribe", "video-background-remover", "video-upscaler", "ai-dubbing", "voice-changer"],
  },
  audio: {
    edit: ["trim-audio", "convert-audio"],
    ai: ["noise-remover", "studio-voice", "vocal-remover", "remove-silence", "transcribe", "voice-changer"],
  },
};

const ACCEPT = "image/*,.heic,.heif,application/pdf,.pdf,video/*,.mp4,.mov,.webm,.mkv,.m4v,audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.opus";

export function kindOf(file: File): Kind | null {
  if (isPdf(file)) return "pdf";
  if (isImage(file)) return "image";
  if (file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v|avi|3gp)$/i.test(file.name)) return "video";
  if (isAudio(file)) return "audio";
  return null;
}

const isHeic = (f: File) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);

interface Version {
  file: File;
  /** Which tool made it ("Original" for the first one). */
  label: string;
}

export function FileWorkspace() {
  const params = useSearchParams();
  const hint = (["image", "pdf", "video", "audio"] as const).find((k) => k === params.get("for")) ?? null;
  const [versions, setVersions] = useState<Version[]>([]);
  const [active, setActive] = useState<ToolSlug | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [notice, setNotice] = useState<{ tool: ToolSlug; checks: string[]; note?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const current = versions[versions.length - 1];
  const kind = current ? kindOf(current.file) : null;

  const start = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!kindOf(file)) {
      setError(`${file.name} isn't a photo, PDF, video or audio file, so the workspace can't open it.`);
      return;
    }
    setError(null);
    setNotice(null);
    setActive(null);
    setVersions([{ file, label: "Original" }]);
  }, []);

  // A file dropped on the homepage (or sent from a tool) arrives here ready.
  useEffect(() => {
    const handed = takeHandoff();
    if (handed.length) start(handed[0]);
  }, [start]);

  const embed: Embed = useMemo(
    () => ({
      onResult(tool: ToolSlug, outputs: Output[]) {
        if (outputs.length !== 1) return false;
        const o = outputs[0];
        const file = blobToFile(o.blob, o.name);
        if (!kindOf(file)) return false; // text, Word, ZIP: stays as a download in the tool
        setVersions((v) => [...v, { file, label: TOOL_BY_SLUG[tool].name }]);
        setNotice({ tool, checks: o.checks, note: o.note });
        setActive(null);
        return true;
      },
      onBack() {
        setActive(null);
      },
    }),
    [],
  );

  function openTool(slug: ToolSlug) {
    if (!current) return;
    setHandoff([current.file]);
    setNotice(null);
    setActive(slug);
    setRunKey((k) => k + 1);
    setTimeout(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  if (!current || !kind) {
    return (
      <div className="ws-empty">
        <Dropzone
          accept={ACCEPT}
          multiple={false}
          onFiles={(f) => start(f[0])}
          title={hint ? `Drop ${hint === "image" ? "a photo" : hint === "pdf" ? "a PDF" : `a${hint === "audio" ? "n audio file" : " video"}`} here` : "Drop a photo, PDF, video or audio file"}
          sub="It opens on your device with every tool for it in one place."
        />
        {error && <p className="msg-error" role="alert">{error}</p>}
        <div className="ws-kinds">
          {(Object.keys(TOOLSETS) as Kind[]).map((k) => (
            <div key={k} className={`ws-kind${hint === k ? " on" : ""}`}>
              <h2>{k === "pdf" ? "PDFs" : `${KIND_NAME[k][0].toUpperCase()}${KIND_NAME[k].slice(1)}${k === "audio" ? "" : "s"}`}</h2>
              <p>{[...TOOLSETS[k].edit, ...TOOLSETS[k].ai].slice(0, 6).map((s) => TOOL_BY_SLUG[s].name).join(", ")} and more.</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const tools = TOOLSETS[kind];
  const editList = isHeic(current.file) ? (["heic-to-jpg", ...tools.edit] as ToolSlug[]) : tools.edit;
  const tool = active ? TOOL_BY_SLUG[active] : null;
  const Runner = active ? RUNNERS[active] : null;

  return (
    <div className="ws">
      <section className="ws-file" aria-label="Your file">
        <Preview file={current.file} kind={kind} />
        <div className="ws-actions">
          <button type="button" className="btn btn-primary" onClick={() => downloadBlob(current.file, current.file.name)}>
            <Download size={18} />
            Download
          </button>
          {versions.length > 1 && (
            <button type="button" className="btn btn-secondary" onClick={() => (setVersions((v) => v.slice(0, -1)), setNotice(null), setActive(null))}>
              <RotateCcw size={18} />
              Undo
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => (setVersions([]), setActive(null), setNotice(null))}>
            New file
          </button>
        </div>
        {versions.length > 1 && (
          <ol className="ws-steps" aria-label="Steps so far">
            {versions.map((v, i) => (
              <li key={i} className={i === versions.length - 1 ? "now" : ""}>
                {i > 0 && <span aria-hidden="true">→</span>}
                {v.label}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="ws-side" ref={panel} aria-label={tool ? tool.name : "Tools"}>
        {notice && !active && (
          <div className="ws-notice" role="status">
            <Check size={18} strokeWidth={3} />
            <div>
              <strong>{TOOL_BY_SLUG[notice.tool].name} done.</strong> {notice.checks.slice(0, 3).join(" · ")}
              {notice.note && <p className="hint">{notice.note}</p>}
              <p className="hint">Download it, or pick another tool to keep going.</p>
            </div>
          </div>
        )}

        {tool && Runner ? (
          <div className="ws-tool">
            <div className="ws-tool-head">
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setActive(null)}>
                <ArrowLeft size={18} />
                All tools
              </button>
              <h2>
                {tool.name} <PlanTag tool={tool} />
              </h2>
            </div>
            <EmbedContext.Provider value={embed}>
              <AccessProvider slug={tool.slug}>
                <AccessBanner />
                <Runner key={runKey} />
              </AccessProvider>
            </EmbedContext.Provider>
          </div>
        ) : (
          <>
            <ToolGroup title={`Edit your ${KIND_NAME[kind]}`} sub="Free, on your device" list={editList} onPick={openTool} />
            <ToolGroup title="AI tools" sub="Free try with a free account" list={tools.ai} onPick={openTool} />
            <p className="hint ws-more">
              Looking for something else? <Link href="/tools/">See all tools</Link>.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function ToolGroup({ title, sub, list, onPick }: { title: string; sub: string; list: ToolSlug[]; onPick: (s: ToolSlug) => void }) {
  return (
    <div className="ws-group">
      <h2>
        {title} <span>{sub}</span>
      </h2>
      <div className="ws-tools">
        {list.map((slug) => {
          const t = TOOL_BY_SLUG[slug];
          return (
            <button key={slug} type="button" className="ws-tool-btn" onClick={() => onPick(slug)}>
              <span className="ws-icon">
                <ToolGlyph slug={slug} />
              </span>
              <span className="ws-name">
                {t.name}
                {toolLevel(t) > 0 && <PlanTag tool={t} />}
              </span>
              <span className="ws-short">{t.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A look at the current file, with its key facts. */
function Preview({ file, kind }: { file: File; kind: Kind }) {
  const [url, setUrl] = useState<string | null>(null);
  const [facts, setFacts] = useState<string>("");
  const [pdfThumb, setPdfThumb] = useState<string | null>(null);

  useEffect(() => {
    setFacts("");
    setPdfThumb(null);
    if (kind === "pdf") {
      let live = true;
      (async () => {
        try {
          const [{ thumbnails }, { pageCount }] = await Promise.all([import("@/lib/pdf-render"), import("@/lib/pdf-ops")]);
          const n = await pageCount(file).catch(() => 0);
          if (live && n) setFacts(`${n} ${n === 1 ? "page" : "pages"}`);
          const [first] = await thumbnails(file, 480, (i, u) => i === 0 && live && setPdfThumb(u));
          if (live && first) setPdfThumb(first);
        } catch {
          if (live) setFacts("Preview unavailable (it may be password-protected)");
        }
      })();
      return () => {
        live = false;
      };
    }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file, kind]);

  return (
    <div className="ws-preview">
      <div className={`ws-stage ws-stage-${kind}`}>
        {kind === "image" && url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Your image" onLoad={(e) => setFacts(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} px`)} onError={() => setFacts("No preview for this format, but the tools still work")} />
        )}
        {kind === "pdf" && (pdfThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pdfThumb} alt="First page of your PDF" />
        ) : (
          <div className="ws-placeholder">PDF</div>
        ))}
        {kind === "video" && url && (
          <video src={url} controls playsInline onLoadedMetadata={(e) => setFacts(`${formatTime(e.currentTarget.duration)}, ${e.currentTarget.videoWidth} × ${e.currentTarget.videoHeight}`)} />
        )}
        {kind === "audio" && url && (
          <div className="ws-audio">
            <div className="ws-placeholder">♪</div>
            <audio src={url} controls onLoadedMetadata={(e) => setFacts(formatTime(e.currentTarget.duration))} />
          </div>
        )}
      </div>
      <p className="ws-facts">
        <strong>{file.name}</strong>
        <span>
          {formatBytes(file.size)}
          {facts ? ` · ${facts}` : ""}
        </span>
      </p>
    </div>
  );
}
