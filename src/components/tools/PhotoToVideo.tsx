"use client";

import { useState } from "react";
import { Segmented } from "../Segmented";
import { ImageAiTool } from "./ImageAiTool";

const IDEAS = ["The camera slowly pushes in", "Hair and clothes move gently in the wind", "Waves roll in and clouds drift", "The person smiles and turns to the camera"];

export default function PhotoToVideo() {
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState<5 | 10>(5);
  const [sound, setSound] = useState(false);
  // Matches the server: 10 seconds doubles the price, natural sound adds half.
  const factor = (seconds === 10 ? 2 : 1) * (sound ? 1.5 : 1);
  return (
    <ImageAiTool
      slug="photo-to-video"
      maxSide={2048}
      suffix="video"
      label="Bringing your photo to life (about 2 to 4 minutes)"
      action="Make video"
      deps={[prompt, seconds, sound]}
      payload={{ prompt, seconds, sound }}
      costFactor={factor}
      checks={[`${seconds}-second clip`, "1080p MP4", sound ? "With sound" : "No sound"]}
      options={
        <>
          <div className="field">
            <label className="field-label" htmlFor="pv">
              Describe the motion (optional)
            </label>
            <textarea id="pv" className="input" rows={2} maxLength={400} value={prompt} placeholder="e.g. the waves roll in and the camera slowly pushes forward" onChange={(e) => setPrompt(e.target.value)} />
            <div className="chips">
              {IDEAS.map((i) => (
                <button key={i} type="button" className="chip" onClick={() => setPrompt(i)}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <Segmented
            legend="Length"
            name="pvlen"
            value={String(seconds)}
            onChange={(v) => setSeconds(v === "10" ? 10 : 5)}
            options={[
              { value: "5", label: "5 seconds" },
              { value: "10", label: "10 seconds" },
            ]}
          />
          <Segmented
            legend="Sound"
            name="pvsound"
            value={sound ? "on" : "off"}
            onChange={(v) => setSound(v === "on")}
            options={[
              { value: "off", label: "No sound" },
              { value: "on", label: "Natural sound" },
            ]}
            hint={sound ? "Adds matching sound, like wind, waves or footsteps." : undefined}
          />
          <p className="hint">Made with Kling 3.0 at 1080p, one of the best video AI models.</p>
        </>
      }
      next={["compress-video", "resize-video"]}
    />
  );
}
