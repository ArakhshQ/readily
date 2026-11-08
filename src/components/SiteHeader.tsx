import Link from "next/link";
import { Logo } from "./Icons";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="wrap">
        <Link href="/" className="brand" aria-label="Readily home">
          <Logo />
          Readily
        </Link>
        <nav className="nav" aria-label="Main">
          <span className="menu-group">
            <Link href="/jpg-to-pdf/">Images to PDF</Link>
            <Link href="/merge-pdf/">Merge PDF</Link>
            <Link href="/compress-image/">Compress image</Link>
          </span>
          <Link href="/tools/">All tools</Link>
        </nav>
      </div>
    </header>
  );
}
