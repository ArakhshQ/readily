import type { Tool } from "@/lib/tools";

const NAMES = ["", "Basic", "Pro", "Premium"] as const;
const IDS = ["", "basic", "pro", "premium"] as const;

/** Small label on paid tools in menus and lists. */
export function PlanTag({ tool }: { tool: Tool }) {
  const l = tool.level ?? 0;
  if (!l) return null;
  return <span className={`tag-plan tag-plan-${IDS[l]}`}>{NAMES[l]}</span>;
}
