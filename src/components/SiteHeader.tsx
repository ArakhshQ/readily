import Link from "next/link";
import { Logo } from "./Icons";
import { ToolsMenu } from "./ToolsMenu";
import { AccountNav } from "./AccountNav";

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
        <ToolsMenu />
        <nav className="nav" aria-label="Main">
          <span className="menu-group">
            <Link href="/pdf-tools/">PDF</Link>
            <Link href="/image-tools/">Image</Link>
            <Link href="/video-tools/">Video</Link>
            <Link href="/audio-tools/">Audio</Link>
            <Link href="/ai-tools/">AI tools</Link>
            <Link href="/pricing/">Pricing</Link>
          </span>
          <AccountNav />
        </nav>
      </div>
    </header>
  );
}
