import { Alert } from "./Icons";

export function Message({ kind, children }: { kind: "error" | "note"; children: React.ReactNode }) {
  return (
    <div className={`msg msg-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Alert size={18} />
      <div>{children}</div>
    </div>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="sr-only" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
