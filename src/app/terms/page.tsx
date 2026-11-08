import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms for using Readily's free file tools.",
  alternates: { canonical: "/terms/" },
};

export default function Terms() {
  return (
    <div className="wrap narrow prose">
      <h1>Terms of use</h1>
      <p className="updated">Last updated November 8, 2026</p>

      <h2>Using Readily</h2>
      <p>
        Readily is a free set of tools for working with your own files. You can use it for personal and work purposes. Please only process files
        you have the right to use.
      </p>

      <h2>Your files are your responsibility</h2>
      <p>
        Your files are processed on your own device and are never sent to us. Keep your originals until you&apos;ve checked each result, and
        always review a file before you submit it to a form, an employer or an institution.
      </p>

      <h2>No guarantee</h2>
      <p>
        We work hard to make every tool reliable, but Readily is provided as is, without warranties of any kind. We can&apos;t promise that a
        result will be accepted by a particular website, form or organization, or that the service will always be available.
      </p>

      <h2>Limits of responsibility</h2>
      <p>
        To the extent the law allows, Readily is not liable for any loss or damage that comes from using the tools, including lost or damaged
        files or a rejected submission.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms as Readily grows. The date at the top shows the latest version.</p>

      {SITE.contactEmail && (
        <>
          <h2>Contact</h2>
          <p>
            <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
          </p>
        </>
      )}
    </div>
  );
}
