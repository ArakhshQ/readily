import Link from "next/link";
import { Logo } from "./Icons";
import { TOOLS } from "@/lib/tools";

export function SiteFooter() {
  const pdf = TOOLS.filter((t) => t.category === "pdf");
  const image = TOOLS.filter((t) => t.category === "image");
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <Link href="/" className="brand" aria-label="Readily home">
              <Logo size={26} />
              Readily
            </Link>
            <p>Free file tools that run on your device. Nothing to install, nothing uploaded.</p>
          </div>
          <div>
            <h3>PDF tools</h3>
            <ul>
              {pdf.map((t) => (
                <li key={t.slug}>
                  <Link href={`/${t.slug}/`}>{t.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Image tools</h3>
            <ul>
              {image.map((t) => (
                <li key={t.slug}>
                  <Link href={`/${t.slug}/`}>{t.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Readily</h3>
            <ul>
              <li>
                <Link href="/about/">About</Link>
              </li>
              <li>
                <Link href="/privacy/">Privacy</Link>
              </li>
              <li>
                <Link href="/terms/">Terms</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-base">© {new Date().getFullYear()} Readily. Your files stay on your device.</div>
      </div>
    </footer>
  );
}
