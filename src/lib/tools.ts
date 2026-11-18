// The catalog of Readily tools. Every page, menu, search result and sitemap
// entry is generated from this list, so adding a tool starts here.
import { PRO_TOOLS } from "./tools-pro";

export type ToolSlug =
  | "jpg-to-pdf"
  | "merge-pdf"
  | "split-pdf"
  | "compress-image"
  | "resize-image"
  | "convert-image"
  | "compress-pdf"
  | "pdf-to-jpg"
  | "organize-pdf"
  | "add-page-numbers"
  | "watermark-pdf"
  | "sign-pdf"
  | "heic-to-jpg"
  | "crop-image"
  | "image-to-text"
  | "trim-video"
  | "compress-video"
  | "video-to-mp3"
  | "convert-audio"
  | "trim-audio"
  | "add-text-to-image"
  | "resize-video"
  | "merge-videos"
  // Paid tools (tools-pro.ts)
  | "noise-remover"
  | "remove-background"
  | "upscale-image"
  | "object-eraser"
  | "searchable-pdf"
  | "protect-pdf"
  | "unlock-pdf"
  | "remove-silence"
  | "pdf-to-word"
  | "summarize-pdf"
  | "chat-with-pdf"
  | "transcribe"
  | "studio-voice"
  | "auto-subtitles"
  | "translate-document"
  | "hd-photo-upscaler"
  | "restore-photo"
  | "colorize-photo"
  | "assistant"
  | "ai-voiceover"
  | "voice-changer"
  | "ai-dubbing"
  | "video-background-remover"
  | "video-upscaler"
  | "photo-to-video"
  | "ai-photo-editor"
  | "product-photo-backgrounds"
  | "grammar-checker"
  | "paraphraser"
  | "vocal-remover";

export type Category = "pdf" | "image" | "video" | "audio" | "text";

/** What kind of file a tool takes in. */
export type InputKind = "image" | "pdf" | "image-pdf" | "heic" | "video" | "audio" | "media" | "text" | "any";

/** 0 = free for everyone; 1 Basic; 2 Pro; 3 Premium. */
export type ToolLevel = 0 | 1 | 2 | 3;

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
  input: InputKind;
  /** Shown as a small "New" label in menus. */
  isNew?: boolean;
  /** Words people type when looking for this tool. */
  keywords: string[];
  /** What the drop zone accepts. */
  accept: string;
  acceptLabel: string;
  multiple: boolean;
  related: ToolSlug[];
  faq: Faq[];
  /** Plan level that unlocks the tool (default 0, free). */
  level?: ToolLevel;
  /** Where the work happens. Server tools use credits. */
  engine?: "device" | "server";
  /** Credits per unit for server tools. */
  credits?: number;
  unit?: string;
  /** Capped per month instead of charged credits. */
  capped?: boolean;
  /** A higher-quality mode only on Premium. */
  /** Required "I have permission" checkbox (voice and face AI tools); the server records it. */
  consent?: string;
  premiumOption?: { name: string; credits: number; what: string };
}

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.heic,.heif";

const FREE_TOOLS: Tool[] = [
  {
    slug: "jpg-to-pdf",
    name: "Images to PDF",
    short: "Turn photos into one PDF",
    title: "JPG to PDF Converter",
    promise: "Put photos and scans into one PDF, in the order you choose, sized for printing or uploading.",
    seoTitle: "JPG to PDF – Convert Images to PDF Online Free",
    seoDescription:
      "Convert JPG, PNG and WebP images to PDF for free. Combine photos into one PDF, reorder pages, pick A4 or Letter. No upload, no sign-up, no watermark.",
    category: "pdf",
    input: "image",
    keywords: ["jpg to pdf", "image to pdf", "png to pdf", "photos to pdf", "scan to pdf", "pictures", "combine images", "image to pdf converter", "convert jpg to pdf", "photo to pdf"],
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
    title: "Merge PDF Files",
    promise: "Join several PDFs into a single file, in exactly the order you want.",
    seoTitle: "Merge PDF – Combine PDF Files Online Free",
    seoDescription:
      "Merge PDF files into one document for free. Drag in your PDFs, set the order and download. Files stay on your device: no upload, no sign-up, no watermark.",
    category: "pdf",
    input: "pdf",
    keywords: ["merge pdf", "combine pdf", "join pdf", "pdf merger", "put pdfs together", "merge pdf files", "combine pdf files", "pdf combiner"],
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
    title: "Split PDF",
    promise: "Pull out the pages you need, or break a PDF into separate files.",
    seoTitle: "Split PDF – Extract Pages From a PDF Online Free",
    seoDescription:
      "Split a PDF into single pages, page ranges or equal parts for free. Extract only the pages you need and download. No upload, no sign-up, no watermark.",
    category: "pdf",
    input: "pdf",
    keywords: ["split pdf", "extract pages", "separate pdf", "pdf pages", "remove pages", "cut pdf", "pdf splitter", "split pdf pages", "extract pages from pdf"],
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
    title: "Compress Image to Any Size",
    promise: "Make photos small enough for any upload limit. Tell Readily the size you need and it finds the best quality that fits.",
    seoTitle: "Compress Image to 100KB, 200KB or Any Size – Free",
    seoDescription:
      "Compress JPG, PNG and WebP images to an exact size like 50KB, 100KB, 200KB or 1MB for forms and applications. Free, in your browser, no upload.",
    category: "image",
    input: "image",
    keywords: ["compress image", "reduce image size", "compress jpg", "image to 100kb", "image to 200kb", "photo size", "kb", "shrink photo", "compress image to 100kb", "compress image to 50kb", "compress jpeg", "image compressor", "reduce photo size"],
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
    title: "Resize Image",
    promise: "Set exact pixel dimensions, scale by percent, or pick a ready-made size for passports and social posts.",
    seoTitle: "Resize Image Online – Change Image Size in Pixels Free",
    seoDescription:
      "Resize JPG, PNG and WebP images to exact pixels or by percent, with presets for passport photos and social media. Free online image resizer, no upload.",
    category: "image",
    input: "image",
    keywords: ["resize image", "image resizer", "change image size", "pixels", "passport photo size", "instagram size", "scale image", "resize photo", "resize image to pixels", "photo resizer", "resize image online"],
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
    title: "Image Converter: PNG, JPG and WebP",
    promise: "Change images to JPG, PNG or WebP so they open and upload anywhere.",
    seoTitle: "Image Converter – PNG to JPG, WebP to JPG, JPG to PNG",
    seoDescription:
      "Convert images for free: PNG to JPG, WebP to JPG, JPG to PNG and more. Batch convert several images at once in your browser. No upload, no sign-up.",
    category: "image",
    input: "image",
    keywords: ["convert image", "png to jpg", "webp to jpg", "jpg to png", "image converter", "webp to png", "heic to jpg", "png to jpg converter", "jpg converter", "convert png to jpg", "convert webp to jpg"],
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
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    short: "Make a PDF smaller",
    title: "Compress PDF",
    promise: "Shrink a PDF so it fits email and upload limits. Readily always shows the new size before you download.",
    seoTitle: "Compress PDF – Reduce PDF File Size Online Free",
    seoDescription:
      "Compress PDF files for email and upload forms, free. Choose how small, see the new size and download. Your PDF stays on your device: no upload, no sign-up.",
    category: "pdf",
    input: "pdf",
    isNew: true,
    keywords: ["compress pdf", "reduce pdf size", "shrink pdf", "pdf too big", "smaller pdf", "pdf under 1mb", "mb", "pdf compressor", "compress pdf to 1mb", "compress pdf to 200kb", "reduce pdf file size"],
    accept: "application/pdf,.pdf",
    acceptLabel: "one PDF file",
    multiple: false,
    related: ["merge-pdf", "split-pdf", "pdf-to-jpg"],
    faq: [
      {
        q: "How much smaller will my PDF get?",
        a: "Scans and PDFs full of photos usually shrink a lot, often by 50 to 90 percent. PDFs that are mostly text are already small and may barely change. Readily shows the exact result and keeps your original if it can't make the file smaller.",
      },
      {
        q: "Will I still be able to select and copy the text?",
        a: "With \"Keep text selectable\" on, yes. Readily only tidies the file's internal structure, which saves less. The stronger levels turn each page into a compressed image, so text can no longer be selected or searched.",
      },
      {
        q: "Is my PDF uploaded?",
        a: "No. Compression happens inside your browser on your own device.",
      },
    ],
  },
  {
    slug: "pdf-to-jpg",
    name: "PDF to JPG",
    short: "Save each page as an image",
    title: "PDF to JPG Converter",
    promise: "Turn every page of a PDF, or just the ones you pick, into sharp JPG or PNG images.",
    seoTitle: "PDF to JPG – Convert PDF Pages to Images Free",
    seoDescription:
      "Convert PDF to JPG or PNG images for free. Turn every page or just the ones you pick into high-quality images. No upload, no sign-up, no watermark.",
    category: "pdf",
    input: "pdf",
    isNew: true,
    keywords: ["pdf to jpg", "pdf to image", "pdf to png", "pdf page to picture", "convert pdf", "screenshot pdf", "convert pdf to jpg", "pdf to jpeg", "pdf to image converter"],
    accept: "application/pdf,.pdf",
    acceptLabel: "one PDF file",
    multiple: false,
    related: ["jpg-to-pdf", "compress-image", "split-pdf"],
    faq: [
      {
        q: "Which resolution should I choose?",
        a: "Standard (150 dpi) is right for screens, email and most upload forms. High (300 dpi) is print quality and makes much larger files.",
      },
      {
        q: "Can I convert only some pages?",
        a: "Yes. Choose \"Pick pages\" and type them the way you would in a print dialog, for example 1-3, 5.",
      },
      {
        q: "Is my PDF uploaded?",
        a: "No. Pages are drawn into images inside your browser.",
      },
    ],
  },
  {
    slug: "organize-pdf",
    name: "Organize PDF",
    short: "Reorder, rotate or delete pages",
    title: "Organize PDF Pages",
    promise: "See every page, then drag them into order, turn sideways pages upright, and remove the ones you don't need.",
    seoTitle: "Organize PDF – Reorder, Rotate and Delete Pages Free",
    seoDescription:
      "Rearrange PDF pages by dragging, rotate sideways pages and delete the ones you don't need, with page previews. Free, in your browser, no upload.",
    category: "pdf",
    input: "pdf",
    isNew: true,
    keywords: ["organize pdf", "rotate pdf", "delete pdf pages", "reorder pdf", "rearrange pdf", "remove pages", "sort pages", "turn pdf", "rearrange pdf pages", "delete pages from pdf", "rotate pdf pages"],
    accept: "application/pdf,.pdf",
    acceptLabel: "one PDF file",
    multiple: false,
    related: ["merge-pdf", "split-pdf", "add-page-numbers"],
    faq: [
      {
        q: "How do I move a page?",
        a: "Drag it to a new spot, or use the arrow buttons under each page. On a phone the arrows are easiest.",
      },
      {
        q: "Does rotating lower the quality?",
        a: "No. Rotation is stored as a setting on the page, so text and images stay exactly as they were.",
      },
      {
        q: "Is my PDF uploaded?",
        a: "No. Previews and the new PDF are made in your browser.",
      },
    ],
  },
  {
    slug: "add-page-numbers",
    name: "Add page numbers",
    short: "Number the pages of a PDF",
    title: "Add Page Numbers to PDF",
    promise: "Number every page in the position and style your teacher, court or office asks for.",
    seoTitle: "Add Page Numbers to PDF Online – Free and Easy",
    seoDescription:
      "Add page numbers to a PDF for free. Choose the position, style and starting number, preview it and download. No upload, no sign-up, no watermark.",
    category: "pdf",
    input: "pdf",
    isNew: true,
    keywords: ["page numbers", "number pdf pages", "pdf page numbering", "page 1 of", "paginate pdf", "add page numbers to pdf", "insert page numbers pdf", "pdf page numbers"],
    accept: "application/pdf,.pdf",
    acceptLabel: "one PDF file",
    multiple: false,
    related: ["organize-pdf", "watermark-pdf", "merge-pdf"],
    faq: [
      {
        q: "Can I leave the cover page without a number?",
        a: "Yes. Turn on \"Skip the first page\". Numbering then starts on page 2 with the number you choose.",
      },
      {
        q: "Will the numbers sit correctly on sideways pages?",
        a: "Yes. Readily places numbers by how each page looks when you open it, including rotated pages.",
      },
      {
        q: "Is my PDF uploaded?",
        a: "No. Numbers are added inside your browser.",
      },
    ],
  },
  {
    slug: "watermark-pdf",
    name: "Watermark PDF",
    short: "Stamp text like DRAFT or CONFIDENTIAL",
    title: "Add Watermark to PDF",
    promise: "Stamp words like DRAFT, COPY or your name across every page, as faint or as bold as you like.",
    seoTitle: "Watermark PDF – Add a Text Watermark to PDF Free",
    seoDescription:
      "Add a text watermark like DRAFT or CONFIDENTIAL to every page of a PDF, free. Set size, color, angle and transparency. Runs in your browser, no upload.",
    category: "pdf",
    input: "pdf",
    isNew: true,
    keywords: ["watermark pdf", "draft", "confidential", "stamp pdf", "add text to pdf", "copy", "add watermark to pdf", "pdf watermark", "stamp pdf online"],
    accept: "application/pdf,.pdf",
    acceptLabel: "one PDF file",
    multiple: false,
    related: ["add-page-numbers", "sign-pdf", "compress-pdf"],
    faq: [
      {
        q: "Can the watermark be removed later?",
        a: "A watermark is drawn onto each page, so it can't be switched off in normal PDF readers. Keep your original file if you might need a clean copy.",
      },
      {
        q: "Which letters are supported?",
        a: "Watermarks currently support English letters, numbers and common punctuation.",
      },
      {
        q: "Is my PDF uploaded?",
        a: "No. The watermark is added in your browser.",
      },
    ],
  },
  {
    slug: "sign-pdf",
    name: "Sign PDF",
    short: "Draw or type your signature",
    title: "Sign PDF",
    promise: "Draw, type or upload your signature, then place it exactly where it belongs on the page.",
    seoTitle: "Sign PDF Online Free – Add Your Signature to a PDF",
    seoDescription:
      "Sign PDF documents online for free. Draw, type or upload your signature and place it on any page. No account, no upload, no watermark.",
    category: "pdf",
    input: "pdf",
    isNew: true,
    keywords: ["sign pdf", "signature", "e-sign", "sign document", "fill and sign", "add signature", "sign pdf online", "electronic signature", "esign pdf", "sign pdf free"],
    accept: "application/pdf,.pdf",
    acceptLabel: "one PDF file",
    multiple: false,
    related: ["add-page-numbers", "merge-pdf", "compress-pdf"],
    faq: [
      {
        q: "Is this a legally binding signature?",
        a: "It adds a picture of your signature to the page, which many people and organizations accept for everyday paperwork. Some contracts require a certified digital signature service instead. Check what the recipient needs.",
      },
      {
        q: "Is my signature saved anywhere?",
        a: "No. Your signature exists only on this page in your browser and disappears when you leave.",
      },
      {
        q: "Can I sign more than one page?",
        a: "Sign one page, then choose \"Sign again\" with the result to add another signature.",
      },
    ],
  },
  {
    slug: "heic-to-jpg",
    name: "HEIC to JPG",
    short: "Convert iPhone photos",
    title: "HEIC to JPG Converter",
    promise: "Turn iPhone HEIC photos into JPGs that open and upload everywhere, in any browser.",
    seoTitle: "HEIC to JPG – Convert iPhone Photos to JPG Free",
    seoDescription:
      "Convert HEIC and HEIF photos from your iPhone to JPG or PNG for free. Batch convert in any browser, keep full quality. No upload, no sign-up.",
    category: "image",
    input: "heic",
    isNew: true,
    keywords: ["heic to jpg", "heic", "heif", "iphone photo", "convert heic", "heic to png", "apple photo", "heic to jpg converter", "convert heic to jpg", "iphone photo to jpg"],
    accept: "image/heic,image/heif,.heic,.heif",
    acceptLabel: "HEIC or HEIF photos",
    multiple: true,
    related: ["compress-image", "jpg-to-pdf", "resize-image"],
    faq: [
      {
        q: "What is a HEIC file?",
        a: "HEIC is the photo format iPhones use by default. It saves space, but many websites, forms and Windows apps can't open it. JPG works everywhere.",
      },
      {
        q: "Will the photo lose quality?",
        a: "At the default 92% quality the difference is invisible for normal viewing. Choose PNG if you need a lossless copy.",
      },
      {
        q: "Are my photos uploaded?",
        a: "No. The conversion happens in your browser. The first conversion downloads a small converter once, then it works fast.",
      },
    ],
  },
  {
    slug: "crop-image",
    name: "Crop image",
    short: "Cut an image to the shape you need",
    title: "Crop Image",
    promise: "Cut away what you don't need, freely or to an exact shape like square, 4:5 or 16:9.",
    seoTitle: "Crop Image Online – Free Photo Cropper With Ratios",
    seoDescription:
      "Crop JPG, PNG and WebP images for free. Freeform or fixed shapes like 1:1, 4:5, 16:9 and 9:16 for social media. Runs in your browser, no upload.",
    category: "image",
    input: "image",
    isNew: true,
    keywords: ["crop image", "crop photo", "cut picture", "square photo", "trim image", "aspect ratio", "1:1", "photo cropper", "crop picture", "crop image online"],
    accept: IMAGE_ACCEPT,
    acceptLabel: "one JPG, PNG or WebP image",
    multiple: false,
    related: ["resize-image", "compress-image", "convert-image"],
    faq: [
      {
        q: "How do I move the crop area?",
        a: "Drag inside the box to move it and drag a corner to resize. Choose a shape first if you need an exact ratio.",
      },
      {
        q: "Does cropping lower the quality?",
        a: "No. The kept area stays at its full original resolution.",
      },
      {
        q: "Is my image uploaded?",
        a: "No. Cropping happens in your browser.",
      },
    ],
  },
  {
    slug: "add-text-to-image",
    name: "Add text to image",
    short: "Put words on a photo",
    title: "Add Text to Image",
    promise: "Write a caption, title or label on any photo. Pick the font, size and colour, then drag it where you want it.",
    seoTitle: "Add Text to Image Online – Free Photo Text Editor",
    seoDescription:
      "Add text to photos for free: captions, titles, quotes and labels. Choose font, size, colour, outline or background, drag to place it, download. No upload.",
    category: "image",
    input: "image",
    isNew: true,
    keywords: ["add text to image", "add text to photo", "write on picture", "caption photo", "text on image", "photo text editor", "meme maker", "put words on photo", "text overlay"],
    accept: IMAGE_ACCEPT,
    acceptLabel: "one JPG, PNG or WebP image",
    multiple: false,
    related: ["crop-image", "resize-image", "compress-image"],
    faq: [
      { q: "How do I move the text?", a: "Drag it on the preview, or use the Top, Middle and Bottom buttons." },
      { q: "Does it lower the quality of my photo?", a: "No. The text is drawn onto the photo at its full original resolution." },
      { q: "Is my image uploaded?", a: "No. Everything happens in your browser." },
    ],
  },
  {
    slug: "image-to-text",
    name: "Image to text",
    short: "Copy text out of a photo or scan (OCR)",
    title: "Image to Text Converter (OCR)",
    promise: "Pull the words out of photos, screenshots and scanned PDFs so you can copy, edit and search them.",
    seoTitle: "Image to Text – Free OCR to Copy Text From Images",
    seoDescription:
      "Free OCR: extract text from images, screenshots and scanned PDFs, then copy or download it. Works in your browser; nothing is uploaded.",
    category: "image",
    input: "image-pdf",
    isNew: true,
    keywords: ["image to text", "ocr", "extract text", "scan to text", "copy text from image", "screenshot to text", "pdf to text", "image to text converter", "ocr online", "extract text from image", "photo to text"],
    accept: `${IMAGE_ACCEPT},application/pdf,.pdf`,
    acceptLabel: "images or a scanned PDF",
    multiple: true,
    related: ["jpg-to-pdf", "pdf-to-jpg", "crop-image"],
    faq: [
      {
        q: "Which languages work?",
        a: "English for now. More languages, including Persian and Arabic scripts, are on the way.",
      },
      {
        q: "How can I get better results?",
        a: "Use a sharp, well-lit photo taken straight on. Cropping to just the text area also helps.",
      },
      {
        q: "Is my file uploaded?",
        a: "No. Text recognition runs in your browser. The first use downloads the reading engine once, about 15 MB.",
      },
    ],
  },
  {
    slug: "trim-video",
    name: "Trim video",
    short: "Cut the start or end off a video",
    title: "Trim Video",
    promise: "Keep just the part you need by setting where the clip starts and ends.",
    seoTitle: "Trim Video Online – Cut MP4 Videos Free",
    seoDescription:
      "Cut the start or end of MP4, MOV or WebM videos for free. Preview, set start and end, download. Runs in your browser: no upload, no watermark.",
    category: "video",
    input: "video",
    isNew: true,
    keywords: ["trim video", "cut video", "shorten video", "clip video", "video cutter", "mp4", "video trimmer", "cut mp4", "trim mp4", "cut video online"],
    accept: "video/*,.mp4,.mov,.webm,.mkv,.m4v",
    acceptLabel: "one MP4, MOV or WebM video",
    multiple: false,
    related: ["compress-video", "video-to-mp3", "trim-audio"],
    faq: [
      {
        q: "Will trimming lower the quality?",
        a: "With \"Fast, original quality\" Readily copies the video without re-encoding, so quality stays identical. The cut can land up to a second or two from the exact time. \"Exact cut\" is precise to the frame but takes longer.",
      },
      {
        q: "How long can my video be?",
        a: "It depends on your device's memory. Phones handle clips up to a few hundred MB well; computers manage more.",
      },
      {
        q: "Is my video uploaded?",
        a: "No. The video engine runs inside your browser. The first use downloads it once, about 30 MB.",
      },
    ],
  },
  {
    slug: "compress-video",
    name: "Compress video",
    short: "Shrink a video for sharing",
    title: "Compress Video",
    promise: "Make videos small enough to email, upload or send, while keeping them watchable.",
    seoTitle: "Compress Video – Reduce MP4 File Size Online Free",
    seoDescription:
      "Compress videos for free: choose a quality and resolution, then download a smaller MP4 for WhatsApp, email or uploads. No upload, no watermark.",
    category: "video",
    input: "video",
    isNew: true,
    keywords: ["compress video", "reduce video size", "shrink video", "video too big", "smaller mp4", "video compressor", "compress mp4", "video size reducer", "reduce video file size", "compress video for whatsapp"],
    accept: "video/*,.mp4,.mov,.webm,.mkv,.m4v",
    acceptLabel: "one MP4, MOV or WebM video",
    multiple: false,
    related: ["trim-video", "video-to-mp3", "compress-image"],
    faq: [
      {
        q: "Why does it take a while?",
        a: "Compressing video is heavy work, and Readily does it on your own device instead of a server. A one-minute phone video usually takes one to a few minutes. Trimming first makes it faster.",
      },
      {
        q: "Which setting should I pick?",
        a: "\"Balanced\" at 720p suits messaging and most uploads. \"Smallest\" at 480p is for strict size limits.",
      },
      {
        q: "Is my video uploaded?",
        a: "No. Everything happens in your browser.",
      },
    ],
  },
  {
    slug: "resize-video",
    name: "Resize video for social media",
    short: "Make a video fit Reels, TikTok or a square post",
    title: "Resize Video for Instagram, TikTok and YouTube",
    promise: "Turn any video into vertical 9:16, square 1:1, portrait 4:5 or wide 16:9, with a blurred background, black bars or a crop.",
    seoTitle: "Resize Video for Instagram Reels, TikTok and Shorts – Free",
    seoDescription:
      "Resize videos to 9:16, 1:1, 4:5 or 16:9 for Reels, TikTok, Shorts and YouTube for free. Blurred background, bars or crop. Runs in your browser, no upload.",
    category: "video",
    input: "video",
    isNew: true,
    keywords: ["resize video", "video resizer", "9:16 video", "resize video for instagram", "resize video for tiktok", "vertical video", "square video", "reels size", "change video aspect ratio", "fit video"],
    accept: "video/*,.mp4,.mov,.webm,.mkv,.m4v",
    acceptLabel: "one MP4, MOV or WebM video",
    multiple: false,
    related: ["trim-video", "compress-video", "merge-videos"],
    faq: [
      { q: "Which shape should I pick?", a: "Vertical 9:16 for Reels, TikTok, Shorts and Stories; square 1:1 or portrait 4:5 for feed posts; wide 16:9 for YouTube." },
      { q: "What does blurred background mean?", a: "Your whole video stays visible in the middle, and a softly blurred copy fills the empty space instead of black bars." },
      { q: "Is my video uploaded?", a: "No. Everything happens in your browser, so long videos can take a few minutes." },
    ],
  },
  {
    slug: "merge-videos",
    name: "Merge videos",
    short: "Join clips into one video",
    title: "Merge Videos",
    promise: "Join two or more clips into one video, in the order you choose, ready to share.",
    seoTitle: "Merge Videos Online – Join MP4 Clips Into One, Free",
    seoDescription:
      "Merge videos for free: join MP4, MOV and WebM clips into one video in any order, with sound kept. Runs in your browser: no upload, no watermark.",
    category: "video",
    input: "video",
    isNew: true,
    keywords: ["merge videos", "join videos", "combine videos", "video joiner", "merge mp4", "combine clips", "put videos together", "video merger"],
    accept: "video/*,.mp4,.mov,.webm,.mkv,.m4v",
    acceptLabel: "two or more MP4, MOV or WebM videos",
    multiple: true,
    related: ["trim-video", "resize-video", "compress-video"],
    faq: [
      { q: "Can the clips be different sizes?", a: "Yes. Each clip is fitted into the same frame with black bars where needed, so nothing is stretched." },
      { q: "How long does it take?", a: "Joining happens on your device, so a few minutes of video can take a few minutes. Keep the tab open." },
      { q: "Are my videos uploaded?", a: "No. Everything happens in your browser." },
    ],
  },
  {
    slug: "video-to-mp3",
    name: "Video to MP3",
    short: "Pull the audio out of a video",
    title: "Video to MP3 Converter",
    promise: "Save the sound from any video as an MP3 you can play anywhere.",
    seoTitle: "Video to MP3 – Convert MP4 to MP3 Online Free",
    seoDescription:
      "Convert video to MP3 for free. Extract the audio from MP4, MOV or WebM files and save it as MP3, right in your browser. No upload, no sign-up.",
    category: "video",
    input: "video",
    isNew: true,
    keywords: ["video to mp3", "mp4 to mp3", "extract audio", "video to audio", "rip audio", "sound from video", "mp4 to mp3 converter", "convert mp4 to mp3", "video to audio converter"],
    accept: "video/*,.mp4,.mov,.webm,.mkv,.m4v",
    acceptLabel: "one MP4, MOV or WebM video",
    multiple: false,
    related: ["trim-audio", "convert-audio", "trim-video"],
    faq: [
      {
        q: "Which quality should I choose?",
        a: "192 kbps is great for music and most uses. 128 kbps is fine for speech and makes smaller files.",
      },
      {
        q: "Can I keep only part of the audio?",
        a: "Yes. Convert to MP3 first, then use Trim audio on the result.",
      },
      {
        q: "Is my video uploaded?",
        a: "No. The audio is extracted in your browser.",
      },
    ],
  },
  {
    slug: "convert-audio",
    name: "Convert audio",
    short: "Switch between MP3, WAV and M4A",
    title: "Audio Converter",
    promise: "Change audio to MP3, WAV or M4A so it plays on any device and uploads anywhere.",
    seoTitle: "Audio Converter – WAV to MP3, M4A to MP3 and More Free",
    seoDescription:
      "Convert audio for free: WAV to MP3, M4A to MP3, MP3 to WAV and more. Batch convert in your browser with no upload and no sign-up.",
    category: "audio",
    input: "audio",
    isNew: true,
    keywords: ["convert audio", "wav to mp3", "m4a to mp3", "mp3 to wav", "audio converter", "ogg", "voice memo", "wav to mp3 converter", "m4a to mp3 converter", "mp3 converter"],
    accept: "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac,.wma,.amr,.webm",
    acceptLabel: "MP3, WAV, M4A, OGG or FLAC files",
    multiple: true,
    related: ["trim-audio", "video-to-mp3", "compress-video"],
    faq: [
      {
        q: "Which format should I choose?",
        a: "MP3 plays everywhere and keeps files small. WAV is uncompressed, which suits editing. M4A is common on Apple devices and sounds good at small sizes.",
      },
      {
        q: "Can I convert voice memos?",
        a: "Yes. Voice memos from phones are usually M4A, AMR or WebM, and all of them can be converted to MP3.",
      },
      {
        q: "Are my files uploaded?",
        a: "No. Conversion happens in your browser.",
      },
    ],
  },
  {
    slug: "trim-audio",
    name: "Trim audio",
    short: "Cut a song or recording",
    title: "Trim Audio",
    promise: "Keep just the part of a song, voice note or recording you need, with a gentle fade if you like.",
    seoTitle: "Trim Audio Online – Free MP3 Cutter and Ringtone Maker",
    seoDescription:
      "Cut MP3, WAV and M4A files for free. Listen, set start and end, add fades and download, great for ringtones. Runs in your browser, no upload.",
    category: "audio",
    input: "audio",
    isNew: true,
    keywords: ["trim audio", "cut mp3", "audio cutter", "ringtone", "cut song", "shorten audio", "fade", "mp3 cutter", "ringtone maker", "audio trimmer", "cut audio online"],
    accept: "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.opus,.flac,.wma,.amr,.webm",
    acceptLabel: "one MP3, WAV, M4A or OGG file",
    multiple: false,
    related: ["convert-audio", "video-to-mp3", "trim-video"],
    faq: [
      {
        q: "How do I find the right spot?",
        a: "Play the audio, pause where you want to start, and press \"Use current time\". Do the same for the end.",
      },
      {
        q: "What format do I get back?",
        a: "MP3 by default, which plays everywhere. You can also choose WAV or M4A.",
      },
      {
        q: "Is my audio uploaded?",
        a: "No. Trimming happens in your browser.",
      },
    ],
  },
];

export const TOOLS: Tool[] = [...FREE_TOOLS, ...PRO_TOOLS];

export const TOOL_BY_SLUG: Record<ToolSlug, Tool> = Object.fromEntries(
  TOOLS.map((t) => [t.slug, t]),
) as Record<ToolSlug, Tool>;

export function toolLevel(t: Tool): ToolLevel {
  return t.level ?? 0;
}

export const CATEGORIES: { id: Category; name: string; blurb: string; path: string }[] = [
  { id: "pdf", name: "PDF tools", blurb: "Build, combine, edit and sign PDFs.", path: "/pdf-tools/" },
  { id: "image", name: "Image tools", blurb: "Hit exact sizes, shapes and formats.", path: "/image-tools/" },
  { id: "video", name: "Video tools", blurb: "Trim, shrink and pull out the sound.", path: "/video-tools/" },
  { id: "audio", name: "Audio tools", blurb: "Convert and cut songs and recordings.", path: "/audio-tools/" },
  { id: "text", name: "Writing tools", blurb: "Fix grammar and rewrite text with AI.", path: "/writing-tools/" },
];

/** Simple search across names, phrases and keywords. */
export function searchTools(query: string): Tool[] {
  const q = query.trim().toLowerCase();
  if (!q) return TOOLS;
  const words = q.split(/\s+/).filter(Boolean);
  return TOOLS.map((t) => {
    const name = t.name.toLowerCase();
    const hay = [t.name, t.short, t.title, t.category, ...t.keywords].join(" ").toLowerCase().replace(/\s+/g, " ");
    const squashed = hay.replace(/\s+/g, "");
    let score = 0;
    for (const w of words) {
      if (name.includes(w)) score += 3;
      else if (hay.includes(w)) score += 1;
      else if (squashed.includes(w)) score += 1;
      else return { t, score: 0 };
    }
    if (hay.includes(q) || squashed.includes(q.replace(/\s+/g, ""))) score += 2;
    return { t, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
}
