"use client";

// The owner's private admin page. Anyone who isn't on the admins list (in the
// database) just sees "This page doesn't exist": every number here comes from
// database functions that refuse to answer for anyone else.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { PLAN_BY_ID, toPlanId } from "@/lib/plans";
import { TOOL_BY_SLUG, type ToolSlug } from "@/lib/tools";

interface Overview {
  users: number;
  new_today: number;
  new_7d: number;
  active_today: number;
  visits_today: number;
  visits_7d: number;
  tool_runs_today: number;
  tool_runs_7d: number;
  ai_jobs_today: number;
  credits_today: number;
  plans: Record<string, number> | null;
  waitlist: Record<string, number> | null;
  paid: Record<string, number> | null;
}
interface Day {
  day: string;
  visits: number;
  views: number;
  tool_runs: number;
  signups: number;
  active_users: number;
  ai_jobs: number;
}
interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  plan_interest: string | null;
  credits: number | null;
  created_at: string;
  last_active: string | null;
  uses_30d: number;
  ai_jobs_30d: number;
  total: number;
}
type Ranked = { label: string; value: number }[];

const METRICS: { key: keyof Omit<Day, "day">; label: string; what: string }[] = [
  { key: "visits", label: "Visitors", what: "Browsers that opened the site (counted once a day)" },
  { key: "views", label: "Page views", what: "Every page opened" },
  { key: "tool_runs", label: "Tool runs", what: "Finished results from any tool, signed in or not" },
  { key: "signups", label: "Sign-ups", what: "New accounts" },
  { key: "active_users", label: "Active users", what: "Signed-in users who used a tool" },
  { key: "ai_jobs", label: "AI jobs", what: "Successful AI tool runs" },
];
const RANGES = [7, 30, 90] as const;
const PAGE_SIZE = 25;

const n = (v: number | null | undefined) => (v ?? 0).toLocaleString("en-US");
const dayLabel = (d: string, long = false) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", ...(long ? { weekday: "short" } : {}) });
function ago(iso: string | null): string {
  if (!iso) return "Never";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : days < 30 ? `${days} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
const planName = (id: string | null) => (id ? PLAN_BY_ID[toPlanId(id)]?.name ?? id : "");
const toolName = (slug: string) => TOOL_BY_SLUG[slug as ToolSlug]?.name ?? slug;
const sourceName = (s: string) => (s === "direct" ? "Direct or unknown" : s.replace(/-(com|org|net|io|co|de|af|app|ai)$/, ".$1"));

/** Estimated monthly revenue from current paid plans (yearly plans spread over 12 months). */
function monthlyRevenue(paid: Record<string, number> | null): number {
  if (!paid) return 0;
  let total = 0;
  for (const [k, count] of Object.entries(paid)) {
    const [plan, interval] = k.split("_");
    const p = PLAN_BY_ID[toPlanId(plan)];
    if (!p) continue;
    const price = parseFloat((interval === "year" ? p.yearly ?? p.price : p.price).replace(/[^0-9.]/g, "")) || 0;
    total += count * (interval === "year" ? price / 12 : price);
  }
  return total;
}

function NotFound() {
  return (
    <div className="wrap narrow prose">
      <h1>This page doesn&apos;t exist</h1>
      <p>The link may be old or mistyped. Every Readily tool is listed on one page.</p>
      <p style={{ marginTop: 24 }}>
        <Link className="btn btn-primary" href="/tools/">
          See all tools
        </Link>
      </p>
    </div>
  );
}

export function AdminPage() {
  const { enabled, loading, session } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!enabled || !session) {
      setAllowed(false);
      return;
    }
    getSupabase()
      .then((sb) => sb.rpc("is_admin"))
      .then(({ data }) => {
        const ok = data === true;
        if (ok) {
          // Your own browsing isn't counted in the visitor numbers.
          try {
            localStorage.setItem("readily-admin", "1");
          } catch {}
        }
        if (ok) document.title = "Admin | Readily";
        setAllowed(ok);
      })
      .catch(() => setAllowed(false));
  }, [enabled, loading, session]);

  if (allowed === null) return <div className="wrap admin" aria-busy="true" />;
  if (!allowed) return <NotFound />;
  return <Admin />;
}

function Admin() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [daily, setDaily] = useState<Day[] | null>(null);
  const [tools, setTools] = useState<Ranked | null>(null);
  const [pages, setPages] = useState<Ranked | null>(null);
  const [sources, setSources] = useState<Ranked | null>(null);
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("visits");
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const sb = await getSupabase();
      const [o, d, t, p, s] = await Promise.all([
        sb.rpc("admin_overview"),
        sb.rpc("admin_daily", { p_days: days }),
        sb.rpc("admin_top_tools", { p_days: days }),
        sb.rpc("admin_top_pages", { p_days: days }),
        sb.rpc("admin_top_sources", { p_days: days }),
      ]);
      const failed = [o, d, t, p, s].find((r) => r.error);
      if (failed?.error) throw failed.error;
      setOverview(o.data as Overview);
      setDaily(((d.data as Day[]) ?? []).map((r) => ({ ...r, ...Object.fromEntries(METRICS.map((m) => [m.key, Number(r[m.key]) || 0])) })));
      setTools(((t.data as { tool: string; uses: number }[]) ?? []).map((r) => ({ label: toolName(r.tool), value: Number(r.uses) })));
      setPages(((p.data as { page: string; views: number }[]) ?? []).map((r) => ({ label: r.page, value: Number(r.views) })));
      setSources(((s.data as { source: string; visits: number }[]) ?? []).map((r) => ({ label: sourceName(r.source), value: Number(r.visits) })));
      setUpdated(new Date());
    } catch (e) {
      setError((e as { message?: string })?.message || "Couldn't load the numbers.");
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const m = METRICS.find((x) => x.key === metric)!;
  const series = useMemo(() => (daily ?? []).map((r) => ({ day: r.day, value: r[metric] })), [daily, metric]);
  const rangeTotal = series.reduce((a, b) => a + b.value, 0);
  const o = overview;
  const paidCount = o?.paid ? Object.values(o.paid).reduce((a, b) => a + b, 0) : 0;
  const waitCount = o?.waitlist ? Object.values(o.waitlist).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="wrap admin">
      <div className="admin-head">
        <div>
          <p className="eyebrow">Only you can see this page</p>
          <h1>Admin</h1>
        </div>
        <div className="admin-head-actions">
          <div className="segmented" role="radiogroup" aria-label="Time range">
            {RANGES.map((r) => (
              <label key={r}>
                <input type="radio" name="range" checked={days === r} onChange={() => setDays(r)} />
                <span>{r} days</span>
              </label>
            ))}
          </div>
          <button className="btn btn-secondary btn-small" onClick={load}>
            Refresh
          </button>
        </div>
      </div>
      {updated && <p className="admin-updated">Updated {updated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. Days are counted in UTC.</p>}
      {error && (
        <p className="msg-error" role="alert">
          {error}
        </p>
      )}

      <section className="admin-stats" aria-label="Today">
        <Stat label="Signed-up users" value={n(o?.users)} note={`+${n(o?.new_today)} today, +${n(o?.new_7d)} this week`} />
        <Stat label="Visitors today" value={n(o?.visits_today)} note={`${n(o?.visits_7d)} in the last 7 days`} />
        <Stat label="Tool runs today" value={n(o?.tool_runs_today)} note={`${n(o?.tool_runs_7d)} in the last 7 days`} />
        <Stat label="Active users today" value={n(o?.active_today)} note={`${n(o?.ai_jobs_today)} AI jobs, ${n(o?.credits_today)} credits used`} />
        <Stat
          label="Paid users"
          value={n(paidCount)}
          note={paidCount ? `About $${monthlyRevenue(o?.paid ?? null).toFixed(0)} a month` : "Payments aren't switched on yet"}
        />
        <Stat
          label="Waitlist"
          value={n(waitCount)}
          note={
            waitCount
              ? Object.entries(o!.waitlist!)
                  .map(([k, v]) => `${v} ${planName(k)}`)
                  .join(", ")
              : "Nobody has asked yet"
          }
        />
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>
              {m.label}: {n(rangeTotal)} in {days} days
            </h2>
            <p className="admin-sub">{m.what}</p>
          </div>
        </div>
        <div className="admin-tabs" role="tablist" aria-label="Chart">
          {METRICS.map((x) => (
            <button key={x.key} role="tab" aria-selected={metric === x.key} className={metric === x.key ? "on" : ""} onClick={() => setMetric(x.key)}>
              {x.label}
            </button>
          ))}
        </div>
        {daily ? <LineChart data={series} label={m.label} /> : <div className="admin-chart-empty">Loading…</div>}
        {daily && (
          <details className="admin-table-view">
            <summary>Show as a table</summary>
            <div className="admin-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    {METRICS.map((x) => (
                      <th key={x.key}>{x.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...daily].reverse().map((r) => (
                    <tr key={r.day}>
                      <td>{dayLabel(r.day, true)}</td>
                      {METRICS.map((x) => (
                        <td key={x.key}>{n(r[x.key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      <div className="admin-grid">
        <section className="admin-card">
          <h2>Most-used tools</h2>
          <p className="admin-sub">Finished results in the last {days} days</p>
          <Bars rows={tools} empty="No tool runs yet." />
        </section>
        <section className="admin-card">
          <h2>Most-viewed pages</h2>
          <p className="admin-sub">Page views in the last {days} days</p>
          <Bars rows={pages} empty="No page views yet." />
        </section>
        <section className="admin-card">
          <h2>Where visitors come from</h2>
          <p className="admin-sub">The site that linked to Readily, last {days} days</p>
          <Bars rows={sources} empty="No visitors yet." />
        </section>
        <section className="admin-card">
          <h2>Plans</h2>
          <p className="admin-sub">Accounts on each plan right now</p>
          <Bars
            rows={
              o
                ? (["free", "basic", "pro", "premium"] as const).map((id) => ({ label: PLAN_BY_ID[id].name, value: o.plans?.[id] ?? 0 }))
                : null
            }
            empty=""
            keepZero
          />
        </section>
      </div>

      <Users />
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

/* ---------------------------------------------------------------- charts */

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const max = Math.ceil(v / (pow * step)) * pow * step;
    if (max / 4 === Math.round(max / 4) || step === 10) return max;
  }
  return v;
}

function LineChart({ data, label }: { data: { day: string; value: number }[]; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 240;
  const pad = { l: 44, r: 12, t: 12, b: 28 };
  const w = width - pad.l - pad.r;
  const h = H - pad.t - pad.b;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const x = (i: number) => pad.l + (data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v: number) => pad.t + h - (v / max) * h;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join("");
  const area = data.length ? `${line}L${x(data.length - 1).toFixed(1)},${pad.t + h}L${x(0).toFixed(1)},${pad.t + h}Z` : "";
  const ticks = [0, 1, 2, 3, 4].map((k) => (max / 4) * k);
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(w / 90))));
  const xLabels = data.map((_, i) => i).filter((i) => i % labelEvery === 0);
  const last = data.length - 1;
  if (last > 0 && last - xLabels[xLabels.length - 1] >= labelEvery * 0.6) xLabels.push(last);

  const pick = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || !data.length) return;
    const rel = clientX - rect.left - pad.l;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round((rel / w) * (data.length - 1)))));
  };
  const hv = hover != null ? data[hover] : null;

  return (
    <div
      className="admin-chart"
      ref={box}
      tabIndex={0}
      aria-label={`${label} per day. Use the arrow keys to read each day.`}
      onPointerMove={(e) => pick(e.clientX)}
      onPointerLeave={() => setHover(null)}
      onBlur={() => setHover(null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          setHover((i) => Math.max(0, Math.min(data.length - 1, (i ?? data.length - 1) + (e.key === "ArrowRight" ? 1 : -1))));
        }
      }}
    >
      <svg width={width} height={H} role="img" aria-hidden="true">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} className={t === 0 ? "axis" : "grid"} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="tick">
              {Number.isInteger(t) ? t.toLocaleString("en-US") : t.toFixed(1)}
            </text>
          </g>
        ))}
        {xLabels.map((i) => (
          <text key={data[i].day} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="tick">
            {dayLabel(data[i].day)}
          </text>
        ))}
        <path d={area} className="area" />
        <path d={line} className="line" />
        {hv && hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + h} className="crosshair" />
            <circle cx={x(hover)} cy={y(hv.value)} r={5} className="dot" />
          </g>
        )}
      </svg>
      {hv && hover != null && (
        <div className="admin-tip" style={{ left: Math.min(Math.max(x(hover), 70), width - 70), top: Math.max(0, y(hv.value) - 58) }} role="status">
          <span>{dayLabel(hv.day, true)}</span>
          <strong>
            {n(hv.value)} {label.toLowerCase()}
          </strong>
        </div>
      )}
    </div>
  );
}

function Bars({ rows, empty, keepZero }: { rows: Ranked | null; empty: string; keepZero?: boolean }) {
  const [all, setAll] = useState(false);
  if (!rows) return <p className="admin-empty">Loading…</p>;
  const list = keepZero ? rows : rows.filter((r) => r.value > 0);
  if (!list.length) return <p className="admin-empty">{empty}</p>;
  const max = Math.max(1, ...list.map((r) => r.value));
  const shown = all ? list : list.slice(0, 10);
  return (
    <>
      <ol className="admin-bars">
        {shown.map((r) => (
          <li key={r.label} title={`${r.label}: ${n(r.value)}`}>
            <span className="label">{r.label}</span>
            <span className="track">
              <span className="fill" style={{ width: `${(r.value / max) * 100}%` }} />
            </span>
            <span className="value">{n(r.value)}</span>
          </li>
        ))}
      </ol>
      {list.length > 10 && (
        <button className="admin-more" onClick={() => setAll((v) => !v)}>
          {all ? "Show top 10" : `Show all ${list.length}`}
        </button>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- users */

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  // Stop spreadsheet apps from running anything that looks like a formula.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function Users() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "paid" | "waitlist">("all");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let live = true;
    setRows(null);
    setError(null);
    getSupabase()
      .then((sb) => sb.rpc("admin_users", { p_search: query, p_filter: filter, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }))
      .then(({ data, error }) => {
        if (!live) return;
        if (error) throw error;
        setRows((data as UserRow[]) ?? []);
      })
      .catch((e) => live && setError((e as { message?: string })?.message || "Couldn't load users."));
    return () => {
      live = false;
    };
  }, [query, filter, page]);

  const total = rows?.[0]?.total ?? 0;
  const pages = Math.max(1, Math.ceil(Number(total) / PAGE_SIZE));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const sb = await getSupabase();
      const out: UserRow[] = [];
      for (let offset = 0; offset < 10000; offset += 500) {
        const { data, error } = await sb.rpc("admin_users", { p_search: query, p_filter: filter, p_limit: 500, p_offset: offset });
        if (error) throw error;
        out.push(...((data as UserRow[]) ?? []));
        if (!data || data.length < 500) break;
      }
      const head = ["Email", "Name", "Plan", "Wants plan", "Credits", "Signed up", "Last active", "Tool runs (30 days)", "AI jobs (30 days)"];
      const lines = [head, ...out.map((r) => [r.email, r.full_name, planName(r.plan), planName(r.plan_interest), r.credits, r.created_at.slice(0, 10), r.last_active?.slice(0, 10), r.uses_30d, r.ai_jobs_30d])];
      const blob = new Blob(["﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `readily-${filter === "all" ? "users" : filter}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      setError((e as { message?: string })?.message || "Couldn't export.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="admin-card admin-users">
      <div className="admin-card-head">
        <div>
          <h2>Users</h2>
          <p className="admin-sub">
            {rows ? `${n(Number(total))} ${filter === "waitlist" ? "on the waitlist" : filter === "paid" ? "paying" : "accounts"}` : "Loading…"}
            {query && ` matching “${query}”`}
          </p>
        </div>
        <button className="btn btn-secondary btn-small" onClick={exportCsv} disabled={exporting || !total}>
          {exporting ? "Preparing…" : "Download CSV"}
        </button>
      </div>
      <div className="admin-filters">
        <input className="input" type="search" placeholder="Search email or name" aria-label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="segmented" role="radiogroup" aria-label="Show">
          {(
            [
              ["all", "Everyone"],
              ["waitlist", "Waitlist"],
              ["paid", "Paid"],
            ] as const
          ).map(([v, l]) => (
            <label key={v}>
              <input type="radio" name="user-filter" checked={filter === v} onChange={() => (setFilter(v), setPage(0))} />
              <span>{l}</span>
            </label>
          ))}
        </div>
      </div>
      {error && (
        <p className="msg-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th className="num">Credits</th>
              <th className="num">Tool runs</th>
              <th className="num">AI jobs</th>
              <th>Last active</th>
              <th>Signed up</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.full_name || "No name"}</strong>
                  <span>{r.email}</span>
                </td>
                <td>
                  <span className={`plan-badge${r.plan !== "free" ? " paid" : ""}`}>{planName(r.plan)}</span>
                  {r.plan === "free" && r.plan_interest && <span className="admin-wants">Wants {planName(r.plan_interest)}</span>}
                </td>
                <td className="num">{n(r.credits)}</td>
                <td className="num">{n(r.uses_30d)}</td>
                <td className="num">{n(r.ai_jobs_30d)}</td>
                <td>{ago(r.last_active)}</td>
                <td>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
              </tr>
            ))}
            {rows && !rows.length && (
              <tr>
                <td colSpan={7} className="admin-empty">
                  {query ? "No one matches that search." : filter === "waitlist" ? "Nobody is on the waitlist yet." : filter === "paid" ? "No paid users yet." : "No accounts yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="admin-sub">Tool runs and AI jobs cover the last 30 days.</p>
      {pages > 1 && (
        <div className="admin-pager">
          <button className="btn btn-secondary btn-small" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page + 1} of {pages}
          </span>
          <button className="btn btn-secondary btn-small" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </section>
  );
}
