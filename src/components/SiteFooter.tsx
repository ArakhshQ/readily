import Link from "next/link";
import { Logo } from "./Icons";
import { CATEGORIES, TOOLS } from "@/lib/tools";

export function SiteFooter() {
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
          {CATEGORIES.map((c) => (
            <div key={c.id}>
              <h3>
                <Link href={c.path}>{c.name}</Link>
              </h3>
              <ul>
                {TOOLS.filter((t) => t.category === c.id).map((t) => (
                  <li key={t.slug}>
                    <Link href={`/${t.slug}/`}>{t.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
