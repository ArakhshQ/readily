"use client";

import { TextAiTool } from "./TextAiTool";

interface Change {
  before: string;
  after: string;
  why: string;
}

export default function GrammarChecker() {
  return (
    <TextAiTool
      slug="grammar-checker"
      maxChars={20_000}
      actionLabel="Check grammar"
      busyLabel="Checking your text"
      resultName="corrected text"
      checks={(res) => {
        const n = ((res.data as { changes?: Change[] })?.changes ?? []).length;
        return [n ? `${n} ${n === 1 ? "fix" : "fixes"}` : "No mistakes found"];
      }}
      extra={(res) => {
        const changes = ((res.data as { changes?: Change[] })?.changes ?? []).slice(0, 200);
        if (!changes.length) return <p className="msg-ok">No mistakes found. Your text is good to go.</p>;
        return (
          <div className="grammar-changes">
            <h3>What was fixed</h3>
            <ol>
              {changes.map((c, i) => (
                <li key={i}>
                  <span className="was">{c.before}</span> <span aria-hidden="true">→</span> <span className="now">{c.after}</span>
                  {c.why && <span className="why">{c.why}</span>}
                </li>
              ))}
            </ol>
          </div>
        );
      }}
      next={["paraphraser", "translate-document"]}
    />
  );
}
