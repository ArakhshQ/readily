// Protect and unlock PDFs with qpdf (Apache-2.0), compiled to WebAssembly and
// served from Readily itself.
import { baseName, formatBytes, type Output } from "./files";

type QpdfModule = {
  FS: { writeFile: (p: string, d: Uint8Array) => void; readFile: (p: string) => Uint8Array };
  callMain: (args: string[]) => number;
};
type Factory = (o: object) => Promise<QpdfModule>;

let script: Promise<Factory> | null = null;

function loadFactory(): Promise<Factory> {
  if (!script) {
    script = new Promise<Factory>((resolve, reject) => {
      const w = window as unknown as { Module?: Factory };
      if (typeof w.Module === "function") return resolve(w.Module);
      const s = document.createElement("script");
      s.src = "/vendor/qpdf/qpdf.js";
      s.onload = () => (typeof w.Module === "function" ? resolve(w.Module) : reject(new Error("qpdf didn't load")));
      s.onerror = () => reject(new Error("qpdf couldn't be downloaded"));
      document.head.appendChild(s);
    }).catch((e) => {
      script = null;
      throw e;
    });
  }
  return script;
}

async function runQpdf(input: Uint8Array, args: (i: string, o: string) => string[]): Promise<{ out: Uint8Array | null; err: string }> {
  const factory = await loadFactory();
  let err = "";
  // This qpdf build writes its messages to the console (it keeps references made at
  // start-up), so listen there from before it starts until it's done.
  const log = console.log;
  const error = console.error;
  console.log = (...a: unknown[]) => void (err += `${a.join(" ")}\n`);
  console.error = (...a: unknown[]) => void (err += `${a.join(" ")}\n`);
  try {
    return await runWith(factory, input, args, () => err);
  } finally {
    console.log = log;
    console.error = error;
  }
}

async function runWith(
  factory: Factory,
  input: Uint8Array,
  args: (i: string, o: string) => string[],
  errText: () => string,
): Promise<{ out: Uint8Array | null; err: string }> {
  const mod = await factory({
    locateFile: () => "/vendor/qpdf/qpdf.wasm",
    noInitialRun: true,
    print: () => {},
  });
  mod.FS.writeFile("/in.pdf", input);
  let code = 0;
  try {
    code = mod.callMain(args("/in.pdf", "/out.pdf"));
  } catch (e) {
    const status = (e as { status?: number })?.status;
    code = typeof status === "number" ? status : 2;
  }
  // 0 = fine, 3 = finished with warnings; anything else failed.
  if (code !== 0 && code !== 3) return { out: null, err: errText() };
  try {
    return { out: mod.FS.readFile("/out.pdf"), err: errText() };
  } catch {
    return { out: null, err: errText() };
  }
}

export async function protectPdf(file: File, password: string, opts: { allowPrint: boolean; allowCopy: boolean }): Promise<Output> {
  if (password.length < 4) throw new Error("Use a password of at least 4 characters.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  // A random owner password, so nobody can lift the restrictions without it.
  const owner = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("");
  const { out, err } = await runQpdf(bytes, (i, o) => [
    "--encrypt",
    password,
    owner,
    "256",
    `--print=${opts.allowPrint ? "full" : "none"}`,
    `--extract=${opts.allowCopy ? "y" : "n"}`,
    "--",
    i,
    o,
  ]);
  if (!out) {
    if (/password/i.test(err)) throw new Error("This PDF is already password-protected. Remove the old password with Unlock PDF first, then protect it again.");
    throw new Error(`This PDF couldn't be protected. ${err.split("\n")[0] || "It may be damaged."}`);
  }
  const blob = new Blob([out as BlobPart], { type: "application/pdf" });
  return {
    blob,
    name: `${baseName(file.name)} (protected).pdf`,
    checks: ["AES-256 encrypted", opts.allowPrint ? "Printing allowed" : "Printing blocked", opts.allowCopy ? "Copying allowed" : "Copying blocked", formatBytes(blob.size)],
  };
}

export async function unlockPdf(file: File, password: string): Promise<Output> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { out, err } = await runQpdf(bytes, (i, o) => [`--password=${password}`, "--decrypt", i, o]);
  if (!out) {
    if (/invalid password|password/i.test(err)) throw new Error("That password doesn't open this PDF. Check it and try again.");
    throw new Error(`This PDF couldn't be unlocked. ${err.split("\n")[0] || "It may be damaged."}`);
  }
  const blob = new Blob([out as BlobPart], { type: "application/pdf" });
  return { blob, name: `${baseName(file.name)} (unlocked).pdf`, checks: ["Password removed", "Opens without a password", formatBytes(blob.size)] };
}
