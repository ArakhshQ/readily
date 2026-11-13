"use client";

import { useState } from "react";
import { useAccess } from "../Access";
import { Message, Progress } from "../Message";
import { ResultPanel } from "../ResultPanel";
import { ToolErrorMessage } from "../ToolErrorMessage";
import { useRun } from "../useRun";
import { VoicePicker } from "./VoicePicker";
import { formatBytes } from "@/lib/files";

const MAX = 10_000;

export default function AiVoiceover() {
  const access = useAccess();
  const r = useRun();
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("");
  const chars = text.trim().length;
  const cost = Math.max(1, Math.ceil(chars / 1000)) * 20;
  const short = (access.gate.kind === "plan" || access.gate.kind === "trial") && cost > access.credits;
  const ok = chars > 0 && chars <= MAX && !!voice && !short;

  return (
    <div className="workspace">
      <div className="options">
        <div className="field">
          <label className="field-label" htmlFor="script">
            Your script
          </label>
          <textarea id="script" className="input" rows={8} value={text} maxLength={MAX} onChange={(e) => (setText(e.target.value), r.reset())} placeholder="Type or paste what the voice should say." />
          <p className="hint">
            {chars.toLocaleString("en-US")} / {MAX.toLocaleString("en-US")} characters · about {Math.max(1, Math.round(chars / 900))} min of speech
          </p>
        </div>
        <VoicePicker value={voice} onChange={(v) => (setVoice(v), r.reset())} />
      </div>
      {!r.outputs && (
        <div className="action-bar">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!ok || r.busy}
            onClick={async () => {
              if (!(await access.allow())) return;
              r.run(async (report) => {
                const { serverRun, creditNote } = await import("@/lib/ai-tools");
                const { fetchResult } = await import("@/lib/ai-client");
                const res = await serverRun("ai-voiceover", { payload: { text: text.trim(), voice } }, report, "Recording your voiceover");
                if (res.credits_left !== undefined) access.setCredits(res.credits_left);
                const blob = await fetchResult(res.files![0]);
                return [{ blob, name: "voiceover.mp3", checks: ["MP3, 128 kbps", `${chars.toLocaleString("en-US")} characters`, creditNote(res), formatBytes(blob.size)] }];
              });
            }}
          >
            {r.busy ? "Recording" : "Create voiceover"}
          </button>
          <span className="summary">{short ? `This needs ${cost} credits and you have ${access.credits}.` : chars ? `About ${cost} credits` : "Type your script"}</span>
        </div>
      )}
      {r.busy && <Progress value={r.progress} label={r.status || "Recording"} />}
      {r.error && <ToolErrorMessage text={r.error} />}
      {r.outputs && <ResultPanel tool="ai-voiceover" outputs={r.outputs} zipName="readily-voiceover.zip" next={["voice-changer", "convert-audio"]} onRestart={() => (setText(""), r.reset())} />}
    </div>
  );
}
