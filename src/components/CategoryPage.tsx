import Link from "next/link";
import { ToolDirectory } from "./ToolDirectory";
import { CATEGORIES, TOOLS, toolLevel, type Category } from "@/lib/tools";

export function CategoryPage({ id, intro, heading }: { id: Category; intro: string; heading?: string }) {
  const cat = CATEGORIES.find((c) => c.id === id)!;
  const inCat = TOOLS.filter((t) => t.category === id);
  const free = inCat.filter((t) => toolLevel(t) === 0).length;
  const paid = inCat.length - free;
  return (
    <section className="section">
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Readily</Link> / <Link href="/tools/">All tools</Link>
        </nav>
        <ToolDirectory only={id} headingLevel={1} heading={heading ?? cat.name} intro={`${intro} ${free} free tools that run on your device${paid ? `, plus ${paid} pro and AI tools` : ""}.`} />
        <p className="other-cats">
          Other tools:{" "}
          {CATEGORIES.filter((c) => c.id !== id).map((c, i, a) => (
            <span key={c.id}>
              <Link href={c.path}>{c.name}</Link>
              {i < a.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
