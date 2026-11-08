import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Readily handles your files and data. In short: your files never leave your device.",
  alternates: { canonical: "/privacy/" },
};

export default function Privacy() {
  return (
    <div className="wrap narrow prose">
      <h1>Privacy</h1>
      <p className="updated">Last updated November 8, 2026</p>

      <h2>Your files never leave your device</h2>
      <p>
        Every Readily tool runs inside your web browser. When you choose a file, your browser reads it from your device and does the work
        there. Readily has no server that receives, stores or looks at your files, so there is nothing for us to keep, share or lose.
      </p>
      <p>
        Results you download are created on your device. When you close or reload the page, the files are gone from Readily, because they were
        only ever held in your browser&apos;s memory.
      </p>

      <h2>What the website itself receives</h2>
      <p>
        Like every website, the server that delivers Readily&apos;s pages sees standard request information, such as your IP address, browser
        type and the page you asked for. Our hosting provider may keep this in short-lived logs to keep the service running and secure. It never
        includes your files.
      </p>

      <h2>Cookies and tracking</h2>
      <p>
        Readily does not use advertising cookies or third-party trackers. If we add privacy-friendly visit counting in the future to learn which
        tools are useful, it will never include file names or file contents, and we will update this page first.
      </p>

      <h2>Offline use</h2>
      <p>
        Readily can save its own pages and code on your device so it opens quickly and works without a connection. This stored copy contains
        only Readily&apos;s website, never your files. You can clear it at any time from your browser&apos;s site settings.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes, we&apos;ll update this page and the date at the top.</p>

      {SITE.contactEmail && (
        <>
          <h2>Contact</h2>
          <p>
            Questions about privacy: <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
          </p>
        </>
      )}
    </div>
  );
}
