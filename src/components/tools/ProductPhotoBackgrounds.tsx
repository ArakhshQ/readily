"use client";

import { useState } from "react";
import { ImageAiTool } from "./ImageAiTool";

const SCENES = [
  ["Clean white studio", "a clean white studio background with a soft natural shadow"],
  ["Marble counter", "a white marble kitchen counter with soft morning light"],
  ["Wooden table", "a warm wooden table with a blurred cosy room behind"],
  ["Outdoors", "a sunny outdoor scene with green plants, softly blurred"],
  ["Festive", "a festive holiday table with warm lights, softly blurred"],
  ["Pastel", "a smooth pastel backdrop with a matching podium"],
] as const;

export default function ProductPhotoBackgrounds() {
  const [scene, setScene] = useState<string>(SCENES[0][1]);
  const [custom, setCustom] = useState("");
  const prompt = custom.trim() || scene;
  return (
    <ImageAiTool
      slug="product-photo-backgrounds"
      maxSide={2048}
      suffix="product"
      label="Creating your product photo"
      action="Create product photo"
      deps={[prompt]}
      payload={{ prompt }}
      checks={["Product kept, new scene"]}
      options={
        <>
          <fieldset className="field">
            <legend>Scene</legend>
            <div className="chips">
              {SCENES.map(([name, p]) => (
                <button key={name} type="button" className={`chip${!custom && scene === p ? " chip-on" : ""}`} aria-pressed={!custom && scene === p} onClick={() => (setScene(p), setCustom(""))}>
                  {name}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="field">
            <label className="field-label" htmlFor="pc">
              Or describe your own
            </label>
            <input id="pc" className="input" maxLength={300} value={custom} placeholder="e.g. on a beach towel next to sunglasses" onChange={(e) => setCustom(e.target.value)} />
          </div>
        </>
      }
      next={["compress-image", "resize-image"]}
    />
  );
}
