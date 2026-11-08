import Link from "next/link";
import { Logo } from "./Icons";
import { ToolsMenu } from "./ToolsMenu";

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
          </span>
          {/* Pricing and account links are added in the plans and accounts steps. */}
        </nav>
      </div>
    </header>
  );
}
