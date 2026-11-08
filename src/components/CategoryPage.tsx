import Link from "next/link";
import { ToolDirectory } from "./ToolDirectory";
import { CATEGORIES, TOOLS, type Category } from "@/lib/tools";

export function CategoryPage({ id, intro }: { id: Category; intro: string }) {
  const cat = CATEGORIES.find((c) => c.id === id)!;
  const count = TOOLS.filter((t) => t.category === id).length;
  return (
    <section className="section">
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Readily</Link> / <Link href="/tools/">All tools</Link>
        </nav>
        <ToolDirectory only={id} headingLevel={1} heading={cat.name} intro={`${intro} ${count} free tools, all running on your device.`} />
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
