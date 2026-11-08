// The catalog of Readily tools. Every page, menu, search result and sitemap
// entry is generated from this list, so adding a tool starts here.

export type ToolSlug =
  | "jpg-to-pdf"
  | "merge-pdf"
  | "split-pdf"
  | "compress-image"
  | "resize-image"
  | "convert-image";

export type Category = "pdf" | "image";

export interface Faq {
  q: string;
  a: string;
}

export interface Tool {
  slug: ToolSlug;
  name: string;
  /** Short verb phrase used on cards and in search. */
  short: string;
  /** H1 on the tool page. */
  title: string;
  /** One-sentence promise directly under the title. */
  promise: string;
  /** <title> and meta description for search engines. */
  seoTitle: string;
  seoDescription: string;
  category: Category;
  /** Words people type when looking for this tool. */
  keywords: string[];
  /** What the drop zone accepts. */
  accept: string;
  acceptLabel: string;
  multiple: boolean;
  related: ToolSlug[];
  faq: Faq[];
}

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.heic,.heif";

export const TOOLS: Tool[] = [
  {
    slug: "jpg-to-pdf",
    name: "Images to PDF",
    short: "Turn photos into one PDF",
    title: "Turn images into a PDF",
    promise: "Put photos and scans into one PDF, in the order you choose, sized for printing or uploading.",
    seoTitle: "JPG to PDF: combine images into one PDF, free and private",
    seoDescription:
      "Convert JPG, PNG and WebP images into a single PDF in your browser. Reorder pages, pick A4 or Letter, and download. No upload, no signup, no watermark.",
    category: "pdf",
    keywords: ["jpg to pdf", "image to pdf", "png to pdf", "photos to pdf", "scan to pdf", "pictures", "combine images"],
    accept: IMAGE_ACCEPT,
    acceptLabel: "JPG, PNG, WebP, GIF or BMP images",
    multiple: true,
    related: ["merge-pdf", "compress-image", "resize-image"],
    faq: [
      {
        q: "Are my photos uploaded anywhere?",
        a: "No. The PDF is built inside your browser, on your own device. Your images never leave it, which is also why it works quickly on large photos.",
      },
      {
        q: "Can I change the order of the pages?",
        a: "Yes. Each image becomes one page. Use the arrows next to each image to move it up or down before you create the PDF.",
      },
      {
        q: "Which page size should I pick?",
        a: "Choose A4 or Letter if the PDF will be printed or submitted to a form that expects standard pages. Choose \"Same as image\" to keep each photo at its own shape with no white borders.",
      },
      {
        q: "My PDF is too big for an upload form. What can I do?",
        a: "Run your photos through Compress image first with a target size, then turn them into a PDF. Smaller photos make a smaller PDF.",
      },
      {
        q: "Do iPhone HEIC photos work?",
        a: "In Safari on a Mac, iPhone or iPad, yes. Other browsers can't open HEIC yet. On iPhone, sharing the photo usually converts it to JPG automatically.",
      },
    ],
  },
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    short: "Combine PDFs into one file",
    title: "Merge PDF files",
    promise: "Join several PDFs into a single file, in exactly the order you want.",
    seoTitle: "Merge PDF: combine PDF files online, free and private",
    seoDescription:
      "Combine multiple PDF files into one in your browser. Drag in your PDFs, set the order and download a single merged PDF. Files stay on your device.",
    category: "pdf",
    keywords: ["merge pdf", "combine pdf", "join pdf", "pdf merger", "put pdfs together"],
    accept: "application/pdf,.pdf",
    acceptLabel: "PDF files",
    multiple: true,
    related: ["split-pdf", "jpg-to-pdf", "compress-image"],
    faq: [
      {
        q: "Is there a limit on how many PDFs I can merge?",
        a: "There's no set limit. Because merging happens on your device, very large files depend on your device's memory. Most phones handle a few hundred pages easily.",
      },
      {
        q: "Will merging lower the quality?",
        a: "No. Pages are copied as they are, so text stays sharp and searchable and images keep their original quality.",
      },
      {
        q: "Why won't one of my PDFs open?",
        a: "Password-protected PDFs can't be merged until the password is removed. Open the file in your PDF reader, enter the password, save a copy without protection, and try again.",
      },
      {
        q: "Are my files uploaded?",
        a: "No. Readily reads and combines the PDFs inside your browser. Nothing is sent to a server.",
      },
    ],
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    short: "Pull out pages or split a PDF",
    title: "Split a PDF",
    promise: "Pull out the pages you need, or break a PDF into separate files.",
    seoTitle: "Split PDF: extract pages from a PDF, free and private",
    seoDescription:
      "Extract page ranges from a PDF or split it into single pages or equal parts, right in your browser. No upload, no signup, no watermark.",
    category: "pdf",
    keywords: ["split pdf", "extract pages", "separate pdf", "pdf pages", "remove pages", "cut pdf"],
    accept: "application/pdf,.pdf",
    acceptLabel: "one PDF file",
    multiple: false,
    related: ["merge-pdf", "jpg-to-pdf", "compress-image"],
    faq: [
      {
        q: "How do I write page ranges?",
        a: "Use commas and dashes, the way you would in a print dialog. For example \"1-3, 5, 8-10\" keeps pages 1, 2, 3, 5, 8, 9 and 10 in one new PDF.",
      },
      {
        q: "Can I remove a page instead?",
        a: "Yes. Extract every page except the one you don't want. For a 10-page file without page 4, type \"1-3, 5-10\".",
      },
      {
        q: "What happens when I split into several files?",
        a: "You get a ZIP file with one PDF per part, named in page order, so they sort correctly on your computer.",
      },
      {
        q: "Are my files uploaded?",
        a: "No. Splitting happens entirely in your browser.",
      },
    ],
  },
  {
    slug: "compress-image",
    name: "Compress image",
    short: "Shrink a photo to an exact size",
    title: "Compress an image to a target size",
    promise: "Make photos small enough for any upload limit. Tell Readily the size you need and it finds the best quality that fits.",
    seoTitle: "Compress image to 100 KB, 200 KB, 500 KB or any size: free",
    seoDescription:
      "Reduce JPG, PNG and WebP images to an exact file size like 50 KB, 200 KB or 1 MB for forms and applications. Runs in your browser, no upload.",
    category: "image",
    keywords: ["compress image", "reduce image size", "compress jpg", "image to 100kb", "image to 200kb", "photo size", "kb", "shrink photo"],
    accept: IMAGE_ACCEPT,
    acceptLabel: "JPG, PNG or WebP images",
    multiple: true,
    related: ["resize-image", "convert-image", "jpg-to-pdf"],
    faq: [
      {
        q: "How does the target size work?",
        a: "Readily tries many quality levels and keeps the best-looking one that stays under your limit. If quality alone isn't enough, it also reduces the dimensions slightly. The result shows the exact final size so you can check it before downloading.",
      },
      {
        q: "Why did my PNG come out as a JPG or WebP?",
        a: "PNG files can't be shrunk much without changing format. To reach a small target size, Readily saves them as JPG (or WebP if you choose it). Transparent areas become white in JPG.",
      },
      {
        q: "What size should I use for application forms?",
        a: "Check the form's instructions. Common limits are 50 KB to 300 KB for photos and signatures and 1 to 2 MB for documents. Pick a target slightly below the limit to be safe.",
      },
      {
        q: "Are my photos uploaded?",
        a: "No. Compression runs in your browser on your device.",
      },
    ],
  },
  {
    slug: "resize-image",
    name: "Resize image",
    short: "Change pixel dimensions",
    title: "Resize an image",
    promise: "Set exact pixel dimensions, scale by percent, or pick a ready-made size for passports and social posts.",
    seoTitle: "Resize image to exact pixels: free online image resizer",
    seoDescription:
      "Resize JPG, PNG and WebP images to exact width and height in pixels or by percentage. Presets for passport photos and social media. Private, in your browser.",
    category: "image",
    keywords: ["resize image", "image resizer", "change image size", "pixels", "passport photo size", "instagram size", "scale image"],
    accept: IMAGE_ACCEPT,
    acceptLabel: "JPG, PNG or WebP images",
    multiple: true,
    related: ["compress-image", "convert-image", "jpg-to-pdf"],
    faq: [
      {
        q: "What's the difference between resize and compress?",
        a: "Resizing changes the width and height in pixels. Compressing keeps roughly the same dimensions and lowers the file size. Many forms ask for both, so resize first, then compress.",
      },
      {
        q: "What happens if the new shape doesn't match my photo?",
        a: "You choose: crop to fill the exact size, fit the whole photo inside with a white border, or stretch it. Crop is best for profile and passport photos.",
      },
      {
        q: "Will my image lose quality?",
        a: "Making an image smaller keeps it sharp. Making it much larger than the original can look soft, because the extra pixels have to be filled in.",
      },
      {
        q: "Are my images uploaded?",
        a: "No. Resizing happens inside your browser.",
      },
    ],
  },
  {
    slug: "convert-image",
    name: "Convert image",
    short: "Switch between JPG, PNG and WebP",
    title: "Convert image format",
    promise: "Change images to JPG, PNG or WebP so they open and upload anywhere.",
    seoTitle: "Convert image to JPG, PNG or WebP: free and private",
    seoDescription:
      "Convert PNG to JPG, WebP to JPG, JPG to PNG and more in your browser. Batch convert several images at once. No upload, no signup.",
    category: "image",
    keywords: ["convert image", "png to jpg", "webp to jpg", "jpg to png", "image converter", "webp to png", "heic to jpg"],
    accept: IMAGE_ACCEPT,
    acceptLabel: "JPG, PNG, WebP, GIF or BMP images",
    multiple: true,
    related: ["compress-image", "resize-image", "jpg-to-pdf"],
    faq: [
      {
        q: "Which format should I choose?",
        a: "JPG works everywhere and is best for photos. PNG keeps transparency and sharp edges, which suits logos and screenshots. WebP gives smaller files and works in all modern browsers and most apps.",
      },
      {
        q: "What happens to transparent backgrounds?",
        a: "PNG and WebP keep transparency. JPG doesn't support it, so transparent areas become white.",
      },
      {
        q: "Can I convert iPhone HEIC photos?",
        a: "Yes in Safari on Mac, iPhone and iPad. Other browsers can't read HEIC files yet.",
      },
      {
        q: "Are my images uploaded?",
        a: "No. Conversion happens in your browser on your device.",
      },
    ],
  },
];

export const TOOL_BY_SLUG: Record<ToolSlug, Tool> = Object.fromEntries(
  TOOLS.map((t) => [t.slug, t]),
) as Record<ToolSlug, Tool>;

export const CATEGORIES: { id: Category; name: string; blurb: string }[] = [
  { id: "pdf", name: "PDF tools", blurb: "Build, combine and split PDFs." },
  { id: "image", name: "Image tools", blurb: "Hit exact sizes, dimensions and formats." },
];

/** Simple search across names, phrases and keywords. */
export function searchTools(query: string): Tool[] {
  const q = query.trim().toLowerCase();
  if (!q) return TOOLS;
  const words = q.split(/\s+/);
  return TOOLS.map((t) => {
    const hay = [t.name, t.short, t.title, ...t.keywords].join(" ").toLowerCase();
    const score = words.reduce((s, w) => (hay.includes(w) ? s + 1 : s), 0);
    return { t, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
}
