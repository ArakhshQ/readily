// Site-wide settings. Set NEXT_PUBLIC_SITE_URL on Render once a domain is connected.
export const SITE = {
  name: "Readily",
  tagline: "Get any file ready for wherever it's going.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://readily-3zay.onrender.com").replace(/\/$/, ""),
  description:
    "Free file tools that run in your browser. Turn photos into a PDF, merge and split PDFs, and compress, resize or convert images to an exact size. No upload, no signup.",
  // Shown on the about/privacy/terms pages only when set (NEXT_PUBLIC_CONTACT_EMAIL on Render).
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
};
