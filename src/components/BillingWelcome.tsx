"use client";

// Where Stripe sends people after paying. The plan switches on when Stripe's
// webhook arrives (usually within seconds), so this page waits for it.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { ArrowRight, ToolGlyph } from "./Icons";
import { PlanTag } from "./PlanTag";
import { PLAN_BY_ID, toPaidPlanId, toPlanId } from "@/lib/plans";
import { TOOLS } from "@/lib/tools";

export function BillingWelcome() {
  const params = useSearchParams();
  const wanted = toPaidPlanId(params.get("welcome"));
  const { session, loading } = useAuth();
  const [plan, setPlan] = useState<string | null>(null);
  const [waited, setWaited] = useState(0);

  useEffect(() => {
    if (!session) return;
    let stop = false;
    (async () => {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = await getSupabase();
      for (let i = 0; i < 30 && !stop; i++) {
        const { data } = await sb.from("profiles").select("plan").eq("id", session.user.id).maybeSingle();
        const p = toPlanId(data?.plan);
        if (p !== "free" && (!wanted || p === wanted)) {
          setPlan(p);
          return;
        }
        setWaited(i + 1);
        await new Promise((r) => setTimeout(r, 2000));
      }
    })();
    return () => {
      stop = true;
    };
  }, [session, wanted]);

  const info = plan ? PLAN_BY_ID[toPlanId(plan)] : null;
  const tools = info ? TOOLS.filter((t) => t.level === info.level).slice(0, 6) : [];

  return (
    <div className="wrap billing-welcome">
      {!loading && !session && (
        <p>
          <Link href="/login/?next=/billing/">Log in</Link> to see your plan.
        </p>
      )}
      {session && !info && (
        <>
          <h1>Thank you!</h1>
          <p>Your payment went through. We&apos;re switching on your plan{waited > 5 ? ", which is taking a little longer than usual" : ""}…</p>
          {waited >= 30 && (
            <p>
              It&apos;s still on its way. Check your <Link href="/dashboard/">dashboard</Link> in a minute; if it doesn&apos;t show, reply to your receipt email and we&apos;ll sort it out.
            </p>
          )}
        </>
      )}
      {info && (
        <>
          <h1>Welcome to {info.name}</h1>
          <p>
            Your plan is on, with <strong>{info.credits.toLocaleString("en-US")} AI credits</strong> a month. Here are a few tools to start with:
          </p>
          <ul className="tool-rows">
            {tools.map((t) => (
              <li key={t.slug}>
                <Link href={`/${t.slug}/`} className="tool-row">
                  <span className="tool-glyph">
                    <ToolGlyph slug={t.slug} />
                  </span>
                  <span>
                    <strong>
                      {t.name}
                      <PlanTag tool={t} />
                    </strong>
                    <span>{t.short}</span>
                  </span>
                  <span className="tool-go">
                    <ArrowRight size={20} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p>
            <Link href="/dashboard/">Go to your dashboard</Link> to see your credits, receipts and billing.
          </p>
        </>
      )}
    </div>
  );
}
