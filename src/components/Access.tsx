"use client";

// Who can use a paid tool, and how: included in their plan, a one-time free try,
// or they need to sign up or upgrade. The server re-checks everything for AI tools.
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import { Message } from "./Message";
import { PLANS, PLAN_BY_ID, toPlanId, type PlanId } from "@/lib/plans";
import { TOOL_BY_SLUG, type Tool, type ToolSlug } from "@/lib/tools";

export type Gate =
  | { kind: "free" } // free tool, nothing to check
  | { kind: "loading" }
  | { kind: "off" } // accounts aren't set up on this site
  | { kind: "login" } // sign up free to try it once
  | { kind: "plan" } // included in the user's plan
  | { kind: "trial" } // one free try left
  | { kind: "upgrade" }; // free try used, or a Premium-only tool

interface AccessState {
  tool: Tool;
  gate: Gate;
  plan: PlanId;
  credits: number;
  /** Plan that unlocks this tool. */
  needs: (typeof PLANS)[number];
  /** For on-device tools: check and use up the free try if needed. Returns false and explains if not allowed. */
  allow: () => Promise<boolean>;
  /** Re-read plan and credits (after an AI job). */
  refresh: () => Promise<void>;
  setCredits: (n: number) => void;
  blocked: string | null;
  clearBlocked: () => void;
}

const Ctx = createContext<AccessState | null>(null);

export function useAccess(): AccessState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAccess outside AccessProvider");
  return v;
}

export function AccessProvider({ slug, children }: { slug: ToolSlug; children: React.ReactNode }) {
  const tool = TOOL_BY_SLUG[slug];
  const level = tool.level ?? 0;
  const { enabled, loading: authLoading, session } = useAuth();
  const [plan, setPlan] = useState<PlanId>("free");
  const [credits, setCredits] = useState(0);
  const [tried, setTried] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const needs = PLANS.find((p) => p.level === level) ?? PLAN_BY_ID.basic;

  const refresh = useCallback(async () => {
    if (!session) return;
    const { getSupabase } = await import("@/lib/supabase");
    const sb = await getSupabase();
    const [{ data: prof }, { data: trial }] = await Promise.all([
      sb.from("profiles").select("plan, credits").eq("id", session.user.id).maybeSingle(),
      sb.from("tool_trials").select("tool").eq("user_id", session.user.id).eq("tool", slug).maybeSingle(),
    ]);
    setPlan(toPlanId(prof?.plan));
    setCredits(Number(prof?.credits ?? 0));
    setTried(!!trial);
    setLoaded(true);
  }, [session, slug]);

  useEffect(() => {
    if (level === 0 || !session) return;
    refresh().catch(() => setLoaded(true));
  }, [level, session, refresh]);

  const gate: Gate = useMemo(() => {
    if (level === 0) return { kind: "free" };
    if (!enabled) return { kind: "off" };
    if (authLoading) return { kind: "loading" };
    if (!session) return { kind: "login" };
    if (!loaded) return { kind: "loading" };
    if (PLAN_BY_ID[plan].level >= level) return { kind: "plan" };
    if (level <= 2 && !tried) return { kind: "trial" };
    return { kind: "upgrade" };
  }, [level, enabled, authLoading, session, loaded, plan, tried]);

  const allow = useCallback(async () => {
    setBlocked(null);
    if (gate.kind === "free" || gate.kind === "plan") return true;
    if (gate.kind === "trial") {
      if (tool.engine === "server") return true; // the server records the try
      const { getSupabase } = await import("@/lib/supabase");
      const sb = await getSupabase();
      const { data, error } = await sb.rpc("use_free_try", { p_tool: slug });
      if (error) {
        setBlocked("Couldn't check your free try. Check your connection and try again.");
        return false;
      }
      setTried(true);
      if (data === true) return true;
    }
    if (gate.kind === "login") setBlocked(`Sign up free to try ${tool.name} once, no card needed.`);
    else if (gate.kind === "off") setBlocked(`${tool.name} opens with the ${needs.name} plan.`);
    else if (gate.kind === "loading") setBlocked("One moment, checking your plan.");
    else setBlocked(`You've used your free try. ${tool.name} is part of ${needs.name} and above.`);
    return false;
  }, [gate.kind, tool, slug, needs.name]);

  const value: AccessState = {
    tool,
    gate,
    plan,
    credits,
    needs,
    allow,
    refresh,
    setCredits,
    blocked,
    clearBlocked: () => setBlocked(null),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The strip above a paid tool: what plan it needs and what this user can do. */
export function AccessBanner() {
  const { tool, gate, needs, credits, plan, blocked } = useAccess();
  if (gate.kind === "free") return null;
  const server = tool.engine === "server";
  const cost =
    server && tool.credits ? `${tool.credits} ${tool.credits === 1 ? "credit" : "credits"} per ${tool.unit}` : server ? "No credits needed" : "Unlimited, runs on your device";
  let line: React.ReactNode;
  switch (gate.kind) {
    case "loading":
      line = "Checking your plan…";
      break;
    case "off":
      line = (
        <>
          Part of <strong>{needs.name}</strong>. <Link href="/pricing/">See plans</Link>
        </>
      );
      break;
    case "login":
      line = (
        <>
          A <strong>{needs.name}</strong> tool. <Link href={`/signup/?next=/${tool.slug}/`}>Sign up free</Link> to try it once
          {server ? " with your 20 free credits" : ""}, or <Link href={`/login/?next=/${tool.slug}/`}>log in</Link>.
        </>
      );
      break;
    case "plan":
      line = (
        <>
          Included in your <strong>{PLAN_BY_ID[plan].name}</strong> plan
          {server && (
            <>
              {" "}
              · <strong>{credits.toLocaleString("en-US")}</strong> credits left
            </>
          )}
        </>
      );
      break;
    case "trial":
      line = (
        <>
          You have <strong>one free try</strong> of this {needs.name} tool
          {server && (
            <>
              {" "}
              (uses your credits: <strong>{credits.toLocaleString("en-US")}</strong> left)
            </>
          )}
          .
        </>
      );
      break;
    case "upgrade":
      line = (
        <>
          {(tool.level ?? 0) > 2 ? "A Premium tool." : "You've used your free try."}{" "}
          <Link href={`/pricing/?plan=${needs.id}`}>Get {needs.name}</Link> to keep using it.
        </>
      );
      break;
  }
  return (
    <div className="access" role="status">
      <span className={`plan-chip plan-chip-${needs.id}`}>{needs.name}</span>
      <span className="access-line">{line}</span>
      <span className="access-cost">{cost}</span>
      {blocked && (
        <div className="access-blocked">
          <Message kind="note">
            {blocked}{" "}
            {gate.kind === "login" ? (
              <Link href={`/signup/?next=/${tool.slug}/`}>Sign up free</Link>
            ) : (
              <Link href={`/pricing/?plan=${needs.id}`}>See plans</Link>
            )}
          </Message>
        </div>
      )}
    </div>
  );
}
