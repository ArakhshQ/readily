"use client";

import { useEffect, useState } from "react";
import { useAccess } from "../Access";
import { PasswordField } from "../auth/PasswordField";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["unlock-pdf"];

export default function UnlockPdf() {
  const f = useFiles("pdf", false);
  const r = useRun();
  const access = useAccess();
  const [pw, setPw] = useState("");
  const { reset } = r;
  useEffect(() => reset(), [f.items, pw, reset]);
  const item = f.items[0];
  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      listHeading="Your PDF"
      options={
        <div style={{ maxWidth: 420 }}>
          <PasswordField id="pw" label="The PDF's password" value={pw} onChange={setPw} autoComplete="off" />
        </div>
      }
      actionLabel="Unlock PDF"
      busyLabel="Unlocking"
      canRun={!!item && pw.length > 0}
      blockedReason={!pw ? "Type the password" : undefined}
      onRun={async () => {
        if (!(await access.allow())) return;
        const { unlockPdf } = await import("@/lib/qpdf");
        r.run(async (report) => {
          report(0.3, "Removing the password");
          return [await unlockPdf(item.file, pw)];
        });
      }}
      zipName="readily-unlocked.zip"
      next={["merge-pdf", "compress-pdf", "organize-pdf"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
