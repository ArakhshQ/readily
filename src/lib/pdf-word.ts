// PDF to Word on the user's device: reads the text with pdf.js (positions, sizes,
// bold and italic), rebuilds headings and paragraphs, and writes a .docx.
import { baseName, formatBytes, type Output } from "./files";

interface Run {
  text: string;
  size: number;
  bold: boolean;
  italic: boolean;
}
interface Line {
  y: number;
  x: number;
  height: number;
  runs: Run[];
  rtl: boolean;
}
interface Block {
  kind: "para" | "image";
  lines?: Line[];
  size?: number;
  image?: { data: Uint8Array; width: number; height: number };
}

const median = (a: number[]) => {
  if (!a.length) return 11;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

export async function pdfToWord(file: File, report: (p: number, label?: string) => void): Promise<Output> {
  const { openPdf } = await import("./pdf-render");
  const lib = await import("pdfjs-dist");
  const doc = await openPdf(file);
  const pages: Block[][] = [];
  const sizes: number[] = [];
  let chars = 0;
  let images = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    report(((p - 1) / doc.numPages) * 0.85, `Reading page ${p} of ${doc.numPages}`);
    const page = await doc.getPage(p);
    // Loading the operator list also loads the fonts, so we can see bold and italic.
    const ops = await page.getOperatorList();
    const tc = await page.getTextContent();
    const lines: Line[] = [];
    for (const it of tc.items) {
      if (!("str" in it) || !it.str) continue;
      const [a, b, , d, x, y] = it.transform as number[];
      const size = Math.round(Math.hypot(a, b) * 10) / 10 || Math.abs(d) || 11;
      let fontName = "";
      try {
        fontName = (page.commonObjs.get(it.fontName) as { name?: string })?.name ?? "";
      } catch {
        /* font not loaded */
      }
      const run: Run = { text: it.str, size, bold: /bold|black|heavy|semibold/i.test(fontName), italic: /italic|oblique/i.test(fontName) };
      const rtl = it.dir === "rtl";
      const tol = size * 0.45;
      let line = lines.find((l) => Math.abs(l.y - y) < tol);
      if (!line) {
        line = { y, x, height: size, runs: [], rtl };
        lines.push(line);
      }
      if (line.runs.length && !/\s$/.test(line.runs[line.runs.length - 1].text) && !/^\s/.test(run.text)) {
        const prev = line.runs[line.runs.length - 1];
        // pdf.js gives separate items for words on some PDFs; keep a space between them.
        if (it.hasEOL === false && prev.text.length > 0) run.text = ` ${run.text}`;
      }
      line.runs.push(run);
      line.x = Math.min(line.x, x);
      line.height = Math.max(line.height, size);
      line.rtl = line.rtl || rtl;
      chars += it.str.length;
      sizes.push(size);
    }
    lines.sort((a, b) => b.y - a.y);

    // Lines into paragraphs: a bigger gap or a change of text size starts a new one.
    const blocks: Block[] = [];
    let cur: Line[] = [];
    const flush = () => {
      if (cur.length) blocks.push({ kind: "para", lines: cur, size: median(cur.flatMap((l) => l.runs.map((r) => r.size))) });
      cur = [];
    };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const prev = cur[cur.length - 1];
      if (prev) {
        const gap = prev.y - l.y;
        const sizeChange = Math.abs(prev.height - l.height) > 1.5;
        if (gap > Math.max(prev.height, l.height) * 1.6 || sizeChange) flush();
      }
      cur.push(l);
    }
    flush();

    // Pictures on the page.
    const OPS = lib.OPS;
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] !== OPS.paintImageXObject) continue;
      const name = ops.argsArray[i][0] as string;
      try {
        const img = (page.objs.has(name) ? page.objs.get(name) : page.commonObjs.get(name)) as {
          width: number;
          height: number;
          bitmap?: ImageBitmap;
          data?: Uint8ClampedArray;
          kind?: number;
        };
        if (!img || img.width < 40 || img.height < 40) continue;
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d")!;
        if (img.bitmap) ctx.drawImage(img.bitmap, 0, 0);
        else if (img.data) {
          const id = ctx.createImageData(img.width, img.height);
          if (img.data.length === img.width * img.height * 4) id.data.set(img.data);
          else {
            // RGB without alpha
            for (let s = 0, t = 0; s < img.data.length; s += 3, t += 4) {
              id.data[t] = img.data[s];
              id.data[t + 1] = img.data[s + 1];
              id.data[t + 2] = img.data[s + 2];
              id.data[t + 3] = 255;
            }
          }
          ctx.putImageData(id, 0, 0);
        } else continue;
        const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.88));
        blocks.push({ kind: "image", image: { data: new Uint8Array(await blob.arrayBuffer()), width: img.width, height: img.height } });
        images++;
      } catch {
        /* skip images pdf.js couldn't hand over */
      }
    }
    pages.push(blocks);
    page.cleanup();
  }
  await doc.loadingTask.destroy();

  if (chars < 20) {
    throw new Error("This PDF has almost no text, so it's probably a scan. Use Scan to searchable PDF first, then convert it.");
  }

  report(0.88, "Writing the Word file");
  const D = await import("docx");
  const body = median(sizes);
  const children: InstanceType<typeof D.Paragraph>[] = [];
  pages.forEach((blocks, pi) => {
    blocks.forEach((b, bi) => {
      if (b.kind === "image" && b.image) {
        const maxW = 600;
        const k = Math.min(1, maxW / b.image.width);
        children.push(
          new D.Paragraph({
            children: [new D.ImageRun({ type: "jpg", data: b.image.data, transformation: { width: Math.round(b.image.width * k), height: Math.round(b.image.height * k) } })],
          }),
        );
        return;
      }
      const lines = b.lines ?? [];
      const size = b.size ?? body;
      const rtl = lines.some((l) => l.rtl);
      const heading = size >= body * 1.6 ? D.HeadingLevel.HEADING_1 : size >= body * 1.25 ? D.HeadingLevel.HEADING_2 : undefined;
      const runs: InstanceType<typeof D.TextRun>[] = [];
      lines.forEach((l, li) => {
        l.runs.forEach((r, ri) => {
          let text = r.text;
          if (ri === 0 && li > 0) {
            // Join wrapped lines; keep hyphenated words together.
            const prevRuns = lines[li - 1].runs;
            const prevText = prevRuns[prevRuns.length - 1]?.text ?? "";
            if (!/-$/.test(prevText)) text = ` ${text.trimStart()}`;
          }
          runs.push(new D.TextRun({ text, bold: r.bold || undefined, italics: r.italic || undefined, size: heading ? undefined : Math.round(r.size * 2), rightToLeft: rtl || undefined }));
        });
      });
      const pageBreak = pi > 0 && bi === 0;
      children.push(new D.Paragraph({ heading, bidirectional: rtl || undefined, pageBreakBefore: pageBreak || undefined, children: runs }));
    });
  });
  const docx = new D.Document({
    creator: "Readily",
    title: baseName(file.name),
    sections: [{ children }],
  });
  const blob = await D.Packer.toBlob(docx);
  return {
    blob: new Blob([blob], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
    name: `${baseName(file.name)}.docx`,
    checks: [`${pages.length} ${pages.length === 1 ? "page" : "pages"} converted`, `${children.length - images} paragraphs`, `${images} ${images === 1 ? "picture" : "pictures"}`, formatBytes(blob.size)],
  };
}
