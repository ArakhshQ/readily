// Tiny assertion helpers (no network imports needed).
export function assert(cond: unknown, msg = "assertion failed"): asserts cond {
  if (!cond) throw new Error(msg);
}
export function assertEquals(a: unknown, b: unknown, msg?: string) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(msg ?? `expected ${sb}, got ${sa}`);
}
export function assertAlmostEquals(a: number, b: number, tol: number) {
  if (Math.abs(a - b) > tol) throw new Error(`expected ${b} ± ${tol}, got ${a}`);
}
export async function assertRejects(fn: () => Promise<unknown>, includes?: string) {
  try {
    await fn();
  } catch (e) {
    if (includes && !String((e as Error).message).includes(includes)) throw new Error(`error "${(e as Error).message}" lacks "${includes}"`);
    return;
  }
  throw new Error("expected a rejection");
}
