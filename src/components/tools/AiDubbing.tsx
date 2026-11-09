"use client";

import { useState } from "react";
import { ServerTool } from "../ServerTool";

// Languages the dubbing engine speaks (ISO 639-1 codes).
const LANGS: [string, string][] = [
  ["en", "English"], ["es", "Spanish"], ["fr", "French"], ["de", "German"], ["it", "Italian"], ["pt", "Portuguese"],
  ["ar", "Arabic"], ["hi", "Hindi"], ["tr", "Turkish"], ["ru", "Russian"], ["uk", "Ukrainian"], ["zh", "Chinese"],
  ["ja", "Japanese"], ["ko", "Korean"], ["id", "Indonesian"], ["ms", "Malay"], ["fil", "Filipino"], ["nl", "Dutch"],
  ["pl", "Polish"], ["sv", "Swedish"], ["da", "Danish"], ["fi", "Finnish"], ["ro", "Romanian"], ["el", "Greek"],
  ["cs", "Czech"], ["sk", "Slovak"], ["bg", "Bulgarian"], ["hr", "Croatian"], ["ta", "Tamil"],
];

export default function AiDubbing() {
  const [target, setTarget] = useState("es");
  const [ok, setOk] = useState(false);
  return (
    <ServerTool
      slug="ai-dubbing"
      input="media"
      maxMinutes={10}
      deps={[target]}
      ready={{ ok, why: "Confirm you have the right to dub this video" }}
      options={
        <>
          <div className="field">
            <label className="field-label" htmlFor="dl">
              Dub into
            </label>
            <select id="dl" className="input" style={{ maxWidth: 320 }} value={target} onChange={(e) => setTarget(e.target.value)}>
              {LANGS.map(([c, n]) => (
                <option key={c} value={c}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <label className="check">
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> I own this video or have permission to dub it.
          </label>
        </>
      }
      actionLabel="Dub it"
      busyLabel="Dubbing (this takes a few minutes)"
      work={async (file, m, report) => {
        const { audioForUpload, deliverAudio } = await import("@/lib/media");
        const { serverRun, creditNote } = await import("@/lib/ai-tools");
        const { fetchResult } = await import("@/lib/ai-client");
        const audio = await audioForUpload(file, m.minutes * 60, (p, l) => report(p * 0.2, l));
        const res = await serverRun("ai-dubbing", { blob: audio, ext: "mp3", payload: { target } }, report, "Translating and re-voicing");
        const dubbed = await fetchResult(res.files![0]);
        const name = LANGS.find(([c]) => c === target)?.[1] ?? target;
        const out = await deliverAudio(file, dubbed, "dub.mp3", `dubbed ${name}`, m.minutes * 60, (p, l) => report(0.93 + p * 0.07, l));
        out.checks = [`Dubbed into ${name}`, ...out.checks, creditNote(res)];
        return { res, outputs: [out] };
      }}
      next={["auto-subtitles", "compress-video"]}
    />
  );
}
