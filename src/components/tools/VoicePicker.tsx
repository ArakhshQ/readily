"use client";

import { useEffect, useRef, useState } from "react";

type Voice = { id: string; name: string; description: string; preview?: string };

/** A list of AI voices with a play button for each preview. */
export function VoicePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [voices, setVoices] = useState<Voice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    import("@/lib/ai-client")
      .then(({ listVoices }) => listVoices())
      .then((v) => {
        setVoices(v);
        if (!value && v[0]) onChange(v[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Voices couldn't be loaded."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (error) return <p className="hint hint-error">{error}</p>;
  if (!voices) return <p className="hint">Loading voices…</p>;
  const current = voices.find((v) => v.id === value);
  return (
    <div className="field">
      <label className="field-label" htmlFor="voice">
        Voice
      </label>
      <div className="voice-row">
        <select id="voice" className="input" value={value} onChange={(e) => onChange(e.target.value)}>
          {voices.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.description ? ` (${v.description})` : ""}
            </option>
          ))}
        </select>
        {current?.preview && (
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={() => {
              audio.current?.pause();
              audio.current = new Audio(current.preview);
              audio.current.play().catch(() => {});
            }}
          >
            Play sample
          </button>
        )}
      </div>
    </div>
  );
}
