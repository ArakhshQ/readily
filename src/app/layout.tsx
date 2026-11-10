import type { Metadata, Viewport } from "next";
import "@fontsource/schibsted-grotesk/400.css";
import "@fontsource/schibsted-grotesk/500.css";
import "@fontsource/schibsted-grotesk/600.css";
import "@fontsource/schibsted-grotesk/700.css";
import "@fontsource/schibsted-grotesk/800.css";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { RegisterSW } from "@/components/RegisterSW";
import { AuthProvider } from "@/components/AuthProvider";
import { SignupNudge } from "@/components/SignupNudge";
import { Analytics } from "@/components/Analytics";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}: free file tools that run in your browser`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name}: free file tools that run in your browser`,
    description: SITE.description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Readily" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#2f5bff",
  width: "device-width",
  initialScale: 1,
};

const siteLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: `${SITE.url}/`,
    logo: `${SITE.url}/icon-512.png`,
    ...(SITE.contactEmail ? { email: SITE.contactEmail } : {}),
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: `${SITE.url}/`,
    description: SITE.description,
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} />
        <AuthProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
          <SignupNudge />
          <Analytics />
        </AuthProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
