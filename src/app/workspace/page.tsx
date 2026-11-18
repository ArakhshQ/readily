import type { Metadata } from "next";
import { Suspense } from "react";
import { FileWorkspace } from "@/components/workspace/FileWorkspace";

export const metadata: Metadata = {
  title: { absolute: "Workspace – Edit Photos, PDFs, Videos and Audio in One Place" },
  description:
    "Drop one file and every tool for it is right there: compress, resize, crop, add text, remove backgrounds, merge, trim, subtitles and more. Free, private, in your browser.",
  alternates: { canonical: "/workspace/" },
  openGraph: { images: [{ url: "/og/workspace.png", width: 1200, height: 630 }] },
};

export default function WorkspacePage() {
  return (
    <div className="wrap ws-page">
      <header className="ws-head">
        <h1>Workspace</h1>
        <p className="lede">One file, every tool. Make changes one after another, undo any step, and download when you&apos;re done.</p>
      </header>
      <Suspense fallback={<div className="ws-empty" aria-busy="true" />}>
        <FileWorkspace />
      </Suspense>
    </div>
  );
}
