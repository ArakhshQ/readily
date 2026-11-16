import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page Not Found", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="wrap narrow prose">
      <h1>This page doesn&apos;t exist</h1>
      <p>The link may be old or mistyped. Every Readily tool is listed on one page.</p>
      <p style={{ marginTop: 24 }}>
        <Link className="btn btn-primary" href="/tools/">
          See all tools
        </Link>
      </p>
    </div>
  );
}
