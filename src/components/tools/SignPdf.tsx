"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { canvasToBlob, loadImage } from "@/lib/files";
import { signPdf } from "@/lib/pdf-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["sign-pdf"];

interface Sig {
  png: Blob;
  url: string;
  width: number;
  height: number;
}

const INKS = [
  { id: "black", css: "#111827", label: "Black" },
  { id: "blue", css: "#1d3fb8", label: "Blue" },
];
const FONTS = [
  { id: "script", css: "'Segoe Script', 'Brush Script MT', 'Snell Roundhand', 'URW Chancery L', cursive", label: "Script" },
  { id: "italic", css: "Georgia, 'Times New Roman', serif", label: "Classic", italic: true },
];

/** Crops a canvas to its drawn pixels (plus padding) and returns a PNG. */
async function trimToSig(src: HTMLCanvasElement): Promise<Sig | null> {
  const ctx = src.getContext("2d")!;
  const { width: W, height: H } = src;
  const data = ctx.getImageData(0, 0, W, H).data;
  let x0 = W,
    y0 = H,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const pad = 6;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(W - 1, x1 + pad);
  y1 = Math.min(H - 1, y1 + pad);
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext("2d")!.drawImage(src, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  const png = await canvasToBlob(out, "image/png");
  return { png, url: URL.createObjectURL(png), width: out.width, height: out.height };
}

function DrawPad({ ink, onDone }: { ink: string; onDone: (s: Sig | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <canvas
        ref={ref}
        width={900}
        height={300}
        className="sig-pad"
        aria-label="Signature drawing area"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          last.current = pos(e);
          const ctx = ref.current!.getContext("2d")!;
          ctx.fillStyle = ink;
          ctx.beginPath();
          ctx.arc(last.current.x, last.current.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          setEmpty(false);
        }}
        onPointerMove={(e) => {
          if (!drawing.current || !last.current) return;
          const p = pos(e);
          const ctx = ref.current!.getContext("2d")!;
          ctx.strokeStyle = ink;
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(last.current.x, last.current.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          last.current = p;
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
        }}
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" disabled={empty} onClick={async () => onDone(await trimToSig(ref.current!))}>
          Use this signature
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            const c = ref.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            setEmpty(true);
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function TypePad({ ink, onDone }: { ink: string; onDone: (s: Sig | null) => void }) {
  const [name, setName] = useState("");
  const [font, setFont] = useState("script");
  const f = FONTS.find((x) => x.id === font)!;
  async function make() {
    const c = document.createElement("canvas");
    c.width = 1400;
    c.height = 300;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = ink;
    ctx.font = `${f.italic ? "italic " : ""}120px ${f.css}`;
    ctx.textBaseline = "middle";
    ctx.fillText(name.trim(), 20, 150, 1360);
    onDone(await trimToSig(c));
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="field">
        <label className="field-label" htmlFor="signame">
          Your name
        </label>
        <input id="signame" className="input" style={{ maxWidth: 420 }} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
      </div>
      <div className="typed-sig" style={{ color: ink, fontFamily: f.css, fontStyle: f.italic ? "italic" : "normal" }} aria-hidden="true">
        {name || "Your signature"}
      </div>
      <Segmented legend="Style" name="sigfont" value={font} onChange={setFont} options={FONTS.map((x) => ({ value: x.id, label: x.label }))} />
      <div>
        <button type="button" className="btn btn-primary" disabled={!name.trim()} onClick={make}>
          Use this signature
        </button>
      </div>
    </div>
  );
}

function UploadPad({ onDone }: { onDone: (s: Sig | null) => void }) {
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="field">
      <label className="field-label" htmlFor="sigimg">
        Photo or scan of your signature
      </label>
      <input
        id="sigimg"
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const img = await loadImage(file);
            const scale = Math.min(1, 1400 / img.naturalWidth);
            const c = document.createElement("canvas");
            c.width = Math.round(img.naturalWidth * scale);
            c.height = Math.round(img.naturalHeight * scale);
            const ctx = c.getContext("2d")!;
            ctx.drawImage(img, 0, 0, c.width, c.height);
            // Make the paper transparent so only the ink lands on the page.
            const d = ctx.getImageData(0, 0, c.width, c.height);
            for (let i = 0; i < d.data.length; i += 4) {
              const light = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 3;
              if (light > 200) d.data[i + 3] = 0;
              else if (light > 150) d.data[i + 3] = Math.round(((200 - light) / 50) * 255);
            }
            ctx.putImageData(d, 0, 0);
            const sig = await trimToSig(c);
            if (!sig) setErr("No signature was found in that image. Use dark ink on light paper.");
            else onDone(sig);
          } catch (x) {
            setErr(x instanceof Error ? x.message : "That image couldn't be opened.");
          }
        }}
      />
      <p className="hint" style={err ? { color: "var(--danger)" } : undefined}>
        {err ?? "Sign on white paper, take a clear photo, and Readily removes the background."}
      </p>
    </div>
  );
}

export default function SignPdf() {
  const f = useFiles("pdf", false);
  const r = useRun();
  const [mode, setMode] = useState<"draw" | "type" | "upload">("draw");
  const [ink, setInk] = useState("black");
  const [sig, setSig] = useState<Sig | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState<{ url: string; w: number; h: number } | null>(null);
  const [spot, setSpot] = useState({ x: 0.58, y: 0.8, w: 0.3 });
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const item = f.items[0];
  useEffect(() => {
    setDoc(null);
    setPreview(null);
    setPage(0);
    if (!item) return;
    let live = true;
    import("@/lib/pdf-render")
      .then(({ openPdf }) => openPdf(item.file))
      .then((d) => {
        if (live) {
          setDoc(d);
          setPage(d.numPages - 1);
        }
      })
      .catch((e) => live && r.setError(e instanceof Error ? e.message : "This PDF couldn't be opened."));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  useEffect(() => {
    if (!doc) return;
    let live = true;
    (async () => {
      const { renderPage } = await import("@/lib/pdf-render");
      const p = await doc.getPage(page + 1);
      const base = p.getViewport({ scale: 1 });
      const canvas = await renderPage(doc, page + 1, Math.min(2, 1200 / base.width));
      if (live) setPreview({ url: canvas.toDataURL("image/jpeg", 0.85), w: canvas.width, h: canvas.height });
    })();
    return () => {
      live = false;
    };
  }, [doc, page]);

  const { reset } = r;
  useEffect(() => reset(), [f.items, sig, page, spot, reset]);

  const inkCss = INKS.find((x) => x.id === ink)!.css;
  const sigHFrac = sig && preview ? (spot.w * sig.height * preview.w) / (sig.width * preview.h) : 0;

  function clamp(x: number, y: number) {
    return { x: Math.min(Math.max(0, x), 1 - spot.w), y: Math.min(Math.max(0, y), Math.max(0, 1 - sigHFrac)) };
  }

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      reorder={false}
      listHeading="PDF to sign"
      options={
        !sig ? (
          <>
            <Segmented
              legend="Create your signature"
              name="sigmode"
              value={mode}
              onChange={setMode}
              options={[
                { value: "draw", label: "Draw" },
                { value: "type", label: "Type" },
                { value: "upload", label: "Upload" },
              ]}
            />
            {mode !== "upload" && (
              <Segmented legend="Ink" name="ink" value={ink} onChange={setInk} options={INKS.map((x) => ({ value: x.id, label: x.label }))} />
            )}
            {mode === "draw" && <DrawPad ink={inkCss} onDone={setSig} />}
            {mode === "type" && <TypePad ink={inkCss} onDone={setSig} />}
            {mode === "upload" && <UploadPad onDone={setSig} />}
          </>
        ) : (
          <>
            <div className="input-row" style={{ justifyContent: "space-between" }}>
              <div className="field">
                <label className="field-label" htmlFor="sigpage">
                  Page
                </label>
                <select id="sigpage" className="select select-inline" value={page} onChange={(e) => setPage(Number(e.target.value))}>
                  {Array.from({ length: doc?.numPages ?? 1 }, (_, i) => (
                    <option key={i} value={i}>
                      Page {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className="btn btn-quiet" onClick={() => setSig(null)}>
                Change signature
              </button>
            </div>
            <p className="hint">Drag your signature into place, or tap where it should go.</p>
            <div
              ref={box}
              className="sign-stage"
              style={preview ? { aspectRatio: `${preview.w} / ${preview.h}` } : { minHeight: 300 }}
              onPointerDown={(e) => {
                if (!box.current || (e.target as HTMLElement).closest(".sig-on-page")) return;
                const rect = box.current.getBoundingClientRect();
                setSpot((s) => ({ ...s, ...clamp((e.clientX - rect.left) / rect.width - s.w / 2, (e.clientY - rect.top) / rect.height - sigHFrac / 2) }));
              }}
            >
              {preview ? <img src={preview.url} alt={`Page ${page + 1} preview`} draggable={false} /> : <p className="hint">Drawing the page…</p>}
              {preview && (
                <img
                  className="sig-on-page"
                  src={sig.url}
                  alt="Your signature"
                  draggable={false}
                  style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%`, width: `${spot.w * 100}%` }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const rect = box.current!.getBoundingClientRect();
                    drag.current = { dx: (e.clientX - rect.left) / rect.width - spot.x, dy: (e.clientY - rect.top) / rect.height - spot.y };
                  }}
                  onPointerMove={(e) => {
                    if (!drag.current || !box.current) return;
                    const rect = box.current.getBoundingClientRect();
                    const d = drag.current;
                    setSpot((s) => ({ ...s, ...clamp((e.clientX - rect.left) / rect.width - d.dx, (e.clientY - rect.top) / rect.height - d.dy) }));
                  }}
                  onPointerUp={() => (drag.current = null)}
                />
              )}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="sigsize">
                Signature size
              </label>
              <div className="range-row" style={{ maxWidth: 480 }}>
                <input
                  id="sigsize"
                  type="range"
                  min={8}
                  max={70}
                  step={1}
                  value={Math.round(spot.w * 100)}
                  onChange={(e) => {
                    const w = parseInt(e.target.value, 10) / 100;
                    setSpot((s) => ({ ...s, w, x: Math.min(s.x, 1 - w) }));
                  }}
                />
                <output htmlFor="sigsize">{Math.round(spot.w * 100)}%</output>
              </div>
            </div>
          </>
        )
      }
      actionLabel="Sign PDF"
      busyLabel="Adding your signature"
      canRun={!!item && !!sig && !!preview}
      blockedReason={!sig ? "Create your signature first." : "Drawing the page…"}
      onRun={() => r.run(async () => [await signPdf(item.file, sig!, { page, ...spot })])}
      zipName="readily-signed.zip"
      next={["sign-pdf", "compress-pdf", "merge-pdf"]}
      onRestart={() => {
        f.setItems([]);
        setSig(null);
        r.reset();
      }}
    />
  );
}
