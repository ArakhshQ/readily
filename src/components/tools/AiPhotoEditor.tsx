"use client";

import { useState } from "react";
import { ImageAiTool } from "./ImageAiTool";

const IDEAS = ["Remove the people in the background", "Make it golden hour", "Replace the sky with a dramatic sunset", "Make it look like a watercolour painting", "Tidy the room"];

export default function AiPhotoEditor() {
  const [prompt, setPrompt] = useState("");
  return (
    <ImageAiTool
      slug="ai-photo-editor"
      maxSide={2048}
      suffix="edited"
      label="Editing your photo"
      action="Edit photo"
      deps={[prompt]}
      payload={{ prompt }}
      ready={{ ok: prompt.trim().length > 3, why: "Describe the change" }}
      checks={["Edited by AI", "2K quality"]}
      unchangedNote={"The AI barely changed your photo. Try saying exactly what to change and where, for example \"remove the man in the red jacket on the left\". For erasing small things you can also use the free Object eraser and paint over them."}
      options={
        <div className="field">
          <label className="field-label" htmlFor="pe">
            What should change?
          </label>
          <textarea id="pe" className="input" rows={3} maxLength={500} value={prompt} placeholder="e.g. Remove the sign on the left and make the sky blue" onChange={(e) => setPrompt(e.target.value)} />
          <div className="chips">
            {IDEAS.map((i) => (
              <button key={i} type="button" className="chip" onClick={() => setPrompt(i)}>
                {i}
              </button>
            ))}
          </div>
          <p className="hint">Tip: name the thing and where it is (&quot;the bin on the right&quot;). Don&apos;t create misleading images of real people or fake documents.</p>
        </div>
      }
      next={["photo-to-video", "compress-image"]}
    />
  );
}
