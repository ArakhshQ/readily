import type { NextConfig } from "next";

// Readily is a fully static site: every tool runs in the visitor's browser,
// so the build is plain HTML/JS/CSS that Render serves as a static site.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
