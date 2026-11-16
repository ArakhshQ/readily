// Loads Paddle.js, Paddle's own checkout. Card and PayPal details are typed into
// Paddle's secure window, never into Readily. Needs NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
// (a public token from Paddle > Developer tools > Authentication; starts with live_).

/* eslint-disable @typescript-eslint/no-explicit-any */
type PaddleJs = any;

export const paddleClientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";
const SCRIPT = "https://cdn.paddle.com/paddle/v2/paddle.js";

let loading: Promise<PaddleJs> | null = null;
const listeners = new Set<(e: { name?: string }) => void>();

/** Called for every checkout event (opened, completed, closed…). */
export function onPaddleEvent(fn: (e: { name?: string }) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function loadPaddle(environment: "production" | "sandbox" = paddleClientToken.startsWith("test_") ? "sandbox" : "production"): Promise<PaddleJs> {
  if (!paddleClientToken) return Promise.reject(new Error("Payments aren't set up yet. Please try again later."));
  if (loading) return loading;
  loading = new Promise<PaddleJs>((resolve, reject) => {
    const w = window as unknown as { Paddle?: PaddleJs };
    const ready = () => {
      const P = w.Paddle;
      if (!P) return reject(new Error("The payment window couldn't load."));
      if (environment === "sandbox") P.Environment.set("sandbox");
      P.Initialize({
        token: paddleClientToken,
        eventCallback: (e: { name?: string }) => listeners.forEach((fn) => fn(e)),
      });
      resolve(P);
    };
    if (w.Paddle) return ready();
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = ready;
    s.onerror = () => {
      loading = null;
      reject(new Error("The payment window couldn't load. Check your connection, or turn off an ad blocker for this site, and try again."));
    };
    document.head.appendChild(s);
  });
  return loading;
}
