"use client";

// "Send feedback": a short form under every tool, and in the footer on every page.
// Messages go to the admin page. Anyone can send one; nobody else can read them.
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { Message } from "./Message";
import { accountsEnabled, getSupabase } from "@/lib/supabase";
import { TOOL_BY_SLUG, type ToolSlug } from "@/lib/tools";

type Kind = "problem" | "idea" | "praise";
const KINDS: { value: Kind; label: string; placeholder: string }[] = [
  { value: "problem", label: "Something's wrong", placeholder: "What happened? What did you expect instead?" },
  { value: "idea", label: "Idea", placeholder: "What would make Readily more useful for you?" },
  { value: "praise", label: "It worked well", placeholder: "What did you use it for? (It helps us know what to keep.)" },
];

/** Opens the feedback form under the current tool, optionally with text filled in. */
export function openFeedback(prefill?: string) {
  window.dispatchEvent(new CustomEvent("readily:feedback", { detail: { prefill } }));
}

function FeedbackForm({ tool, prefill, onClose }: { tool?: string; prefill?: string; onClose?: () => void }) {
  const { session } = useAuth();
  const id = useId();
  const [kind, setKind] = useState<Kind>("problem");
  const [message, setMessage] = useState(prefill ?? "");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (prefill !== undefined) setMessage(prefill);
    box.current?.focus();
  }, [prefill]);

  if (sent) {
    return (
      <div className="feedback-done" role="status">
        <p>
          <strong>Thank you.</strong> We read every message{session || contact ? " and reply when we can" : ""}.
        </p>
        {onClose && (
          <button type="button" className="btn btn-secondary btn-small" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (text.length < 3) return setError("Write a few words first.");
    setBusy(true);
    setError(null);
    try {
      const sb = await getSupabase();
      const { error } = await sb.from("feedback").insert({
        kind,
        tool: tool ?? null,
        page: window.location.pathname.slice(0, 200),
        message: text.slice(0, 2000),
        contact: session ? null : contact.trim().slice(0, 200) || null,
      });
      if (error) throw error;
      setSent(true);
    } catch (x) {
      const msg = (x as { message?: string })?.message || "";
      setError(/feedback|email us/i.test(msg) ? msg : "Couldn't send it. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const current = KINDS.find((k) => k.value === kind)!;
  return (
    <form className="feedback-form" onSubmit={send} noValidate>
      <div className="segmented" role="radiogroup" aria-label="Type of feedback">
        {KINDS.map((k) => (
          <label key={k.value}>
            <input type="radio" name={`${id}-kind`} checked={kind === k.value} onChange={() => setKind(k.value)} />
            <span>{k.label}</span>
          </label>
        ))}
      </div>
      <label className="sr-only" htmlFor={`${id}-msg`}>
        Your message
      </label>
      <textarea
        id={`${id}-msg`}
        ref={box}
        className="input feedback-text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={current.placeholder}
        maxLength={2000}
        rows={4}
        required
      />
      {!session && (
        <div className="field">
          <label className="field-label" htmlFor={`${id}-contact`}>
            Email, if you&apos;d like a reply <span className="optional">(optional)</span>
          </label>
          <input id={`${id}-contact`} className="input" type="text" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} autoComplete="email" />
        </div>
      )}
      {error && <Message kind="error">{error}</Message>}
      <div className="feedback-actions">
        <button type="submit" className="btn btn-primary btn-small" disabled={busy}>
          {busy ? "Sending…" : "Send"}
        </button>
        {onClose && (
          <button type="button" className="btn btn-secondary btn-small" onClick={onClose}>
            Cancel
          </button>
        )}
        <span className="fine">Please don&apos;t include passwords or private details. Your files are never attached.</span>
      </div>
    </form>
  );
}

/** Under each tool: a one-line prompt that opens the form. */
export function ToolFeedback({ tool }: { tool: string }) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<string | undefined>();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setPrefill((e as CustomEvent<{ prefill?: string }>).detail?.prefill);
      setOpen(true);
      setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    };
    window.addEventListener("readily:feedback", onOpen);
    return () => window.removeEventListener("readily:feedback", onOpen);
  }, []);

  if (!accountsEnabled) return null;
  return (
    <section className="tool-feedback" ref={ref} aria-label="Feedback">
      {open ? (
        <>
          <h2>Tell us how it went</h2>
          <FeedbackForm tool={tool} prefill={prefill} onClose={() => setOpen(false)} />
        </>
      ) : (
        <p>
          Did this tool do what you needed?{" "}
          <button type="button" className="link-btn" onClick={() => (setPrefill(undefined), setOpen(true))}>
            Send feedback
          </button>
        </p>
      )}
    </section>
  );
}

/** In the footer: opens the form in a dialog on any page. */
export function FooterFeedback() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const path = usePathname();
  if (!accountsEnabled) return null;
  const slug = path?.match(/^\/([a-z0-9-]+)\/?$/)?.[1];
  const tool = slug && TOOL_BY_SLUG[slug as ToolSlug] ? slug : undefined;
  const close = () => {
    dialog.current?.close();
    setOpen(false);
  };
  return (
    <>
      <button
        type="button"
        className="link-btn footer-feedback"
        onClick={() => {
          setOpen(true);
          dialog.current?.showModal();
        }}
      >
        Send feedback
      </button>
      <dialog ref={dialog} className="feedback-dialog" onClose={() => setOpen(false)} aria-labelledby="fb-title">
        <h2 id="fb-title">Send feedback</h2>
        <p className="fine">Found a problem or have an idea? We read every message.</p>
        {open && <FeedbackForm tool={tool} onClose={close} />}
      </dialog>
    </>
  );
}
