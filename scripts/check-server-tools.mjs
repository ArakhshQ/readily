// Fails the build if the website's prices (src/lib/tools-pro.ts) and the AI
// server's prices (supabase/functions/_shared/tools.ts) ever disagree.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = readFileSync(join(root, "src/lib/tools-pro.ts"), "utf8");
const server = readFileSync(join(root, "supabase/functions/_shared/tools.ts"), "utf8");

const siteTools = {};
for (const block of site.split(/\n  \{\n/).slice(1)) {
  const slug = block.match(/slug: "([^"]+)"/)?.[1];
  if (!slug || !/engine: "server"/.test(block)) continue;
  siteTools[slug] = {
    level: Number(block.match(/level: (\d)/)?.[1]),
    credits: Number(block.match(/\n    credits: (\d+)/)?.[1] ?? 0),
    best: Number(block.match(/premiumOption: \{[^}]*credits: (\d+)/)?.[1] ?? 0) || undefined,
  };
}
const serverTools = {};
for (const m of server.matchAll(/^\s+"?([a-z-]+)"?: \{ level: (\d), kind: "\w+", credits: (\d+)(?:, best: \{ credits: (\d+) \})?/gm)) {
  serverTools[m[1]] = { level: Number(m[2]), credits: Number(m[3]), best: m[4] ? Number(m[4]) : undefined };
}
const problems = [];
for (const slug of new Set([...Object.keys(siteTools), ...Object.keys(serverTools)])) {
  const a = JSON.stringify(siteTools[slug]);
  const b = JSON.stringify(serverTools[slug]);
  if (a !== b) problems.push(`${slug}: website ${a ?? "missing"} vs server ${b ?? "missing"}`);
}
if (problems.length) {
  console.error(`AI tool prices differ between the website and the server:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`AI tool prices match (${Object.keys(siteTools).length} tools)`);
