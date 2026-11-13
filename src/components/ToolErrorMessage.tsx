"use client";

// An error message that turns any other Readily tool it mentions into a link,
// e.g. "Run it through Scan to searchable PDF first." Following the link brings
// the user's file along, so they don't have to choose it again.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Message } from "./Message";
import { openFeedback } from "./Feedback";
import { setHandoff } from "@/lib/handoff";
import { TOOLS, type Tool } from "@/lib/tools";

// Longest names first, so "Compress PDF" never steals part of a longer name.
const BY_NAME = [...TOOLS].sort((a, b) => b.name.length - a.name.length);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PATTERN = new RegExp(`(${BY_NAME.map((t) => escape(t.name)).join("|")})`, "g");
const BY_EXACT = new Map(TOOLS.map((t) => [t.name, t]));

export function ToolErrorMessage({ text, files: all }: { text: string; files?: File[] }) {
  // When the message is about one particular file ("report.pdf is password-protected"), bring only that one.
  const named = all?.find((f) => text.startsWith(f.name));
  const files = named ? [named] : all;
  const path = usePathname();
  const current = path?.replace(/^\/|\/$/g, "");
  const parts = text.split(PATTERN);
  const linked: Tool[] = [];

  const body = parts.map((part, i) => {
    const tool = i % 2 === 1 ? BY_EXACT.get(part) : undefined;
    if (!tool || tool.slug === current) return part;
    if (!linked.includes(tool)) linked.push(tool);
    return (
      <Link key={i} href={`/${tool.slug}/`} onClick={() => files?.length && setHandoff(files)}>
        {part}
      </Link>
    );
  });

  const first = linked[0];
  return (
    <Message kind="error">
      <p>{body}</p>
      <p className="error-actions">
        {first && (
          <Link className="btn btn-secondary btn-small" href={`/${first.slug}/`} onClick={() => files?.length && setHandoff(files)}>
            Open {first.name}
            {files?.length ? (files.length === 1 ? " with this file" : " with these files") : ""}
          </Link>
        )}
        {!first && (
          <button type="button" className="link-btn" onClick={() => openFeedback(`It showed this error: "${text}"\n\nWhat I was doing: `)}>
            Report this problem
          </button>
        )}
      </p>
    </Message>
  );
}
