"use client";

import { useCallback, useState } from "react";
import type { Output } from "@/lib/files";

/** Busy / progress / error / result state for one tool run. */
export function useRun() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Output[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const run = useCallback(async (work: (report: (p: number, label?: string) => void) => Promise<Output[]>) => {
    setBusy(true);
    setError(null);
    setOutputs(null);
    setProgress(0);
    setStatus(null);
    // Let the button state paint before heavy work starts.
    await new Promise((r) => setTimeout(r, 30));
    try {
      const out = await work((p, label) => {
        setProgress(p);
        if (label) setStatus(label);
      });
      setProgress(1);
      setOutputs(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again with a different file.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }, []);

  const reset = useCallback(() => {
    setOutputs(null);
    setError(null);
    setProgress(0);
  }, []);

  return { busy, progress, error, outputs, run, reset, setError, status };
}
