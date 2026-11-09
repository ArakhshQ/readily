"use client";

import { useEffect, useState } from "react";
import { useAccess } from "../Access";
import { PasswordField } from "../auth/PasswordField";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["protect-pdf"];

export default function ProtectPdf() {
  const f = useFiles("pdf", false);
  const r = useRun();
  const access = useAccess();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [print, setPrint] = useState(true);
  const [copy, setCopy] = useState(false);
  const { reset } = r;
  useEffect(() => reset(), [f.items, pw, pw2, print, copy, reset]);
  const item = f.items[0];
  const mismatch = pw2.length > 0 && pw !== pw2;
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      listHeading="Your PDF"
      options={
        <>
          <div className="field-pair">
            <PasswordField id="pw" label="Password" value={pw} onChange={setPw} autoComplete="new-password" />
            <PasswordField id="pw2" label="Type it again" value={pw2} onChange={setPw2} autoComplete="new-password" />
          </div>
          {mismatch && <p className="hint hint-error">The passwords don&apos;t match yet.</p>}
          <fieldset className="field">
            <legend>People who open it can</legend>
            <label className="check">
              <input type="checkbox" checked={print} onChange={(e) => setPrint(e.target.checked)} /> Print it
            </label>
            <label className="check">
              <input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} /> Copy its text
            </label>
          </fieldset>
        </>
      }
      actionLabel="Protect PDF"
      busyLabel="Encrypting"
      canRun={!!item && pw.length >= 4 && pw === pw2}
      blockedReason={!pw ? "Choose a password" : pw.length < 4 ? "Use at least 4 characters" : pw !== pw2 ? "Type the same password twice" : undefined}
      onRun={async () => {
        if (!(await access.allow())) return;
        const { protectPdf } = await import("@/lib/qpdf");
        r.run(async (report) => {
          report(0.3, "Encrypting with AES-256");
          return [await protectPdf(item.file, pw, { allowPrint: print, allowCopy: copy })];
        });
      }}
      zipName="readily-protected.zip"
      next={["watermark-pdf", "compress-pdf"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
