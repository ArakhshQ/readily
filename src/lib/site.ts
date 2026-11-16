// Site-wide settings. Set NEXT_PUBLIC_SITE_URL on Render once a domain is connected.
export const SITE = {
  name: "Readily",
  tagline: "Get any file ready for wherever it's going.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://readilytools.com").replace(/\/$/, ""),
  description:
    "Free online tools to merge, compress and convert PDFs, compress and resize images, and convert video and audio. Runs in your browser: no upload, no sign-up.",
  // Shown on the about/privacy/terms pages only when set (NEXT_PUBLIC_CONTACT_EMAIL on Render).
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  // The business behind Readily (Impressum, terms, privacy). Set on Render.
  businessName: (process.env.NEXT_PUBLIC_BUSINESS_NAME || "").trim(),
  businessAddress: (process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || "")
    .split(";")
    .map((l) => l.trim())
    .filter(Boolean),
};
