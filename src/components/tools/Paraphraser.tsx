"use client";

import { useState } from "react";
import { Segmented } from "../Segmented";
import { TextAiTool } from "./TextAiTool";

type Mode = "fluent" | "simple" | "shorter" | "formal" | "friendly";
const HINT: Record<Mode, string> = {
  fluent: "Smoother, more natural wording with the same meaning and length.",
  simple: "Plain words and short sentences anyone can follow.",
  shorter: "The same points in fewer words.",
  formal: "Professional tone for work, school and applications.",
  friendly: "Warm and relaxed, like talking to a person.",
};

export default function Paraphraser() {
  const [mode, setMode] = useState<Mode>("fluent");
  return (
    <TextAiTool
      slug="paraphraser"
      maxChars={10_000}
      payload={{ mode }}
      options={
        <Segmented
          legend="Rewrite it"
          name="pmode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "fluent", label: "Fluent" },
            { value: "simple", label: "Simpler" },
            { value: "shorter", label: "Shorter" },
            { value: "formal", label: "Formal" },
            { value: "friendly", label: "Friendly" },
          ]}
          hint={HINT[mode]}
        />
      }
      actionLabel="Rewrite"
      busyLabel="Rewriting your text"
      resultName="rewritten text"
      checks={() => [`Style: ${mode === "simple" ? "simpler" : mode}`]}
      next={["grammar-checker", "translate-document"]}
    />
  );
}
