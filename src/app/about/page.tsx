import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: "Why Readily exists: fast, private file tools for forms, applications and everyday uploads.",
  alternates: { canonical: "/about/" },
};

export default function About() {
  return (
    <div className="wrap narrow prose">
      <h1>About Readily</h1>
      <p className="updated">Small file jobs, done properly.</p>

      <p>
        Most of us hit the same wall again and again. A form wants a photo under 200 KB. A university portal accepts only one PDF. A job
        application asks for an image exactly 600 × 600 pixels. The usual answer is a website that uploads your private documents to a server you
        know nothing about, adds a watermark, or asks you to sign up first.
      </p>
      <p>Readily is a different answer.</p>

      <h2>What we believe</h2>
      <ul>
        <li>Your files should stay on your device. Every everyday tool runs in your browser, so nothing is uploaded. The few AI tools that need a server say so first, and delete your file within 24 hours.</li>
        <li>You should be able to say what you need, like &ldquo;under 500 KB,&rdquo; and get exactly that.</li>
        <li>Everyday tools should be free, fast and free of tricks. No watermarks, no forced signups.</li>
        <li>A result should be checked before you use it. Every Readily result shows its final size, dimensions and page count.</li>
      </ul>

      <h2>What&apos;s next</h2>
      <p>
        We&apos;re starting with the tools people need most for documents and photos, and adding more as we learn what helps. A Readily app is on
        the way. In the meantime you can install Readily from your browser and use it like an app, even offline.
      </p>
      <p>
        <Link href="/tools/">See all tools</Link>
        {SITE.contactEmail && (
          <>
            {" "}
            or write to us at <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
          </>
        )}
        .
      </p>
    </div>
  );
}
