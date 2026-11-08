"use client";

// Player plus start/end controls shared by Trim video and Trim audio.
import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/files";

interface Props {
  file: File;
  kind: "video" | "audio";
  duration: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}

function parseTime(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const parts = t.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || isNaN(Number(p)))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

function TimeField({ id, label, value, max, onSet, onNow }: { id: string; label: string; value: number; max: number; onSet: (v: number) => void; onNow: () => void }) {
  const [text, setText] = useState(formatTime(value));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setText(formatTime(value));
    setBad(false);
  }, [value]);
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-row">
        <div className="input-unit">
          <input
            id={id}
            value={text}
            inputMode="decimal"
            aria-invalid={bad}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              const v = parseTime(text);
              if (v === null || v < 0 || v > max) {
                setBad(true);
              } else onSet(v);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
          <span className="unit">m:ss</span>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onNow}>
          Use current time
        </button>
      </div>
      {bad && <p className="hint" style={{ color: "var(--danger)" }}>Use a time like 1:05 between 0:00 and {formatTime(max)}.</p>}
    </div>
  );
}

export function MediaTrim({ file, kind, duration, start, end, onChange }: Props) {
  const media = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const now = () => media.current?.currentTime ?? 0;
  const pctStart = duration ? (start / duration) * 100 : 0;
  const pctEnd = duration ? (end / duration) * 100 : 100;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {url &&
        (kind === "video" ? (
          <video ref={media} className="media-preview" src={url} controls playsInline preload="metadata" />
        ) : (
          <audio ref={media} className="audio-preview" src={url} controls preload="metadata" />
        ))}
      <div className="trim-bar" aria-hidden="true">
        <div style={{ left: `${pctStart}%`, width: `${Math.max(0, pctEnd - pctStart)}%` }} />
      </div>
      <div className="two-col">
        <TimeField id="tstart" label="Start" value={start} max={duration} onSet={(v) => onChange(Math.min(v, end - 0.1), end)} onNow={() => onChange(Math.min(now(), end - 0.1), end)} />
        <TimeField id="tend" label="End" value={end} max={duration} onSet={(v) => onChange(start, Math.max(v, start + 0.1))} onNow={() => onChange(start, Math.max(now(), start + 0.1))} />
      </div>
      <p className="hint">
        Keeping {formatTime(Math.max(0, end - start))} of {formatTime(duration)}.{" "}
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            if (media.current) {
              media.current.currentTime = start;
              void media.current.play();
            }
          }}
        >
          Play from start point
        </button>
      </p>
    </div>
  );
}
