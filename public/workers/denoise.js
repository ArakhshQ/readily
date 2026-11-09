// Voice noise remover worker: runs DeepFilterNet3 (MIT / Apache-2.0) over 48 kHz mono
// samples, off the main thread so the page stays responsive.
let df = null;

self.onmessage = async (e) => {
  const { samples, attenuation } = e.data;
  try {
    if (!df) {
      const mod = await import("/vendor/dfn/index.js");
      df = await mod.DeepFilter.create({ wasmUrl: "/vendor/dfn/df_bg.wasm", attenuationLimit: attenuation });
    }
    df.setAttenuationLimit(attenuation);
    const n = df.frameLength;
    // The model looks a little ahead, so its output lags the input. Feed extra
    // silence at the end and drop the same amount from the start.
    const lag = 2 * n;
    const total = samples.length + lag;
    const padded = new Float32Array(Math.ceil(total / n) * n);
    padded.set(samples);
    const out = new Float32Array(padded.length);
    const frames = padded.length / n;
    let last = 0;
    for (let i = 0; i < frames; i++) {
      out.set(df.process(padded.subarray(i * n, (i + 1) * n)), i * n);
      const now = Date.now();
      if (now - last > 200) {
        last = now;
        self.postMessage({ type: "progress", value: i / frames });
      }
    }
    const result = out.slice(lag, lag + samples.length);
    self.postMessage({ type: "done", samples: result }, [result.buffer]);
  } catch (err) {
    self.postMessage({ type: "error", message: String(err && err.message ? err.message : err) });
  }
};
