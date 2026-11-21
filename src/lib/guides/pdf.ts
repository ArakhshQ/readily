import type { Guides } from "./types";

// Written guides for the PDF tools. Plain words, specific to each tool, no filler.
export const PDF_GUIDES: Guides = {
  "jpg-to-pdf": {
    howTo: "How to convert JPG images to PDF",
    steps: [
      "Drop your photos or scans into the box above, or tap to choose them. You can add JPG, PNG, WebP, GIF and BMP images together.",
      "Put them in order with the arrows. Each image becomes one page, top to bottom.",
      "Pick a page size: A4 or Letter for printing and forms, or “Same as image” to keep each photo's own shape.",
      "Create the PDF and download it. The result shows the number of pages and the file size.",
    ],
    sections: [
      {
        h: "When to turn photos into one PDF",
        p: [
          "Most application portals, schools and offices want a single PDF, not a folder of phone photos. Putting the pages of a form, an ID card front and back, or a multi-page receipt into one file makes it easy to upload and easy for the other person to read in order.",
          "It is also the simplest way to send a set of scanned pages by email: one attachment instead of ten.",
        ],
        list: [
          "Scanned forms and signed documents",
          "ID cards, certificates and transcripts for applications",
          "Receipts and invoices for expense reports",
          "Homework and handwritten notes photographed with a phone",
        ],
      },
      {
        h: "Getting a clean, readable PDF from phone photos",
        p: [
          "Take each photo straight on, in good light, with the page filling most of the frame. If a photo includes the table around the page, crop it first with Crop image so the page fills the PDF.",
          "If the PDF has to stay under an upload limit, compress the photos first with Compress image. A 4 MB phone photo usually looks the same on screen at 300 to 500 KB, and the PDF will be that much smaller.",
        ],
      },
      {
        h: "Private by design",
        p: [
          "The PDF is assembled in your browser. Your photos are never uploaded, so this is safe for ID documents and personal paperwork, and it works quickly even with many large images.",
        ],
      },
    ],
    faq: [
      { q: "Can I add more images after creating the PDF?", a: "Add all the images first, then create the PDF. If you need to add pages later, make a second PDF and join both with Merge PDF." },
      { q: "Is there a limit on the number of images?", a: "No set limit. Very large batches depend on your device's memory; phones comfortably handle dozens of photos." },
    ],
  },

  "merge-pdf": {
    howTo: "How to merge PDF files",
    steps: [
      "Drop two or more PDFs into the box above, or tap to choose them.",
      "Use the arrows to put the files in the order you want them in the final document.",
      "Press Merge PDFs. The files are joined page for page.",
      "Download the combined PDF. The result shows the total page count and size.",
    ],
    sections: [
      {
        h: "What merging keeps",
        p: [
          "Readily copies each page exactly as it is. Text stays selectable and searchable, images keep their full quality, and page sizes are not changed, so a mix of A4 and Letter pages stays a mix.",
          "Nothing is re-compressed, which is why the merged file is roughly the size of the files added together. If it is too big to send, run it through Compress PDF afterwards.",
        ],
      },
      {
        h: "Common reasons to combine PDFs",
        list: [
          "Putting a cover letter, CV and certificates into one application file",
          "Joining the chapters or parts of a report",
          "Combining monthly statements or invoices for your records",
          "Sending one attachment instead of several",
        ],
        p: [],
      },
      {
        h: "Need only some pages from a file?",
        p: [
          "Merging always takes every page. To leave pages out, first use Split PDF to extract the pages you want, or Organize PDF to delete and reorder pages, then merge the results.",
        ],
      },
    ],
    faq: [
      { q: "Can I merge PDFs on my phone?", a: "Yes. Readily works in the browser on iPhone and Android. Choose the files from Files or your downloads, set the order with the arrows and download the merged PDF." },
      { q: "Do bookmarks and links survive?", a: "Page content, including text, images and annotations drawn on the page, is kept. Bookmarks from the original files are not carried over." },
    ],
  },

  "split-pdf": {
    howTo: "How to split a PDF (unmerge it into separate files)",
    steps: [
      "Drop one PDF into the box above.",
      "Choose how to split: Pick pages to pull out specific pages, Every page to get one PDF per page, or Equal parts to cut it into pieces of the same length.",
      "For Pick pages, type the pages the way you would in a print dialog, for example 1-3, 5, 8-10.",
      "Press the button and download. Several parts come as one ZIP with the files named in page order.",
    ],
    sections: [
      {
        h: "Unmerge a PDF that was combined",
        p: [
          "If several documents were scanned or merged into one PDF, splitting is how you get them apart again. Note where each document starts, then use Pick pages once per document, or Equal parts if every document has the same number of pages.",
          "Every page gives you a separate file for each page, which is handy for scanned single-page forms or for uploading pages one by one.",
        ],
      },
      {
        h: "Extract or remove pages",
        p: [
          "To keep just a few pages, list them: “2, 4-6” makes a new PDF with pages 2, 4, 5 and 6. To remove a page, list everything except that page. Your original file is never changed.",
          "If you want to reorder or rotate pages rather than separate them, use Organize PDF, which shows every page as a picture.",
        ],
      },
      {
        h: "Quality and privacy",
        p: [
          "Pages are copied without being re-rendered, so text stays sharp and selectable. Splitting happens in your browser, so confidential documents are never uploaded.",
        ],
      },
    ],
    faq: [
      { q: "Is splitting the same as unmerging?", a: "Yes. “Unmerge” is another word for splitting a combined PDF back into separate documents." },
      { q: "Can I split a password-protected PDF?", a: "Remove the password first with Unlock PDF (you need to know it), then split the unlocked copy." },
    ],
  },

  "compress-pdf": {
    howTo: "How to compress a PDF",
    steps: [
      "Drop your PDF into the box above.",
      "Choose how small: Keep text selectable for a light, safe squeeze, Balanced for most uploads, or Smallest for strict limits.",
      "Press Compress PDF and wait while the pages are processed on your device.",
      "Check the new size shown in the result, then download. If the file couldn't get smaller, you keep the original.",
    ],
    sections: [
      {
        h: "Which level to choose",
        p: [
          "Keep text selectable tidies the inside of the file without touching how pages look. Text stays searchable and copyable. It helps most with files saved inefficiently by other apps.",
          "Balanced and Smallest redraw each page as a compressed image. This is what shrinks scans and photo-heavy PDFs by 50 to 90 percent. The trade-off is that text becomes part of the picture, so it can no longer be selected. For forms and applications that only need to be read, that's usually fine.",
        ],
      },
      {
        h: "Fitting an upload or email limit",
        p: [
          "Email services often cap attachments at 20 to 25 MB, and many application portals accept 1, 2 or 5 MB. Start with Balanced; if it is still too big, try Smallest. Readily shows the exact result before you download, so you never have to guess.",
          "If a PDF is mostly text and still large, it may contain big embedded images or fonts. Splitting it into parts with Split PDF is another way to stay under a limit.",
        ],
      },
      {
        h: "Private, on your device",
        p: [
          "Your PDF is compressed inside your browser and never uploaded. That matters for bank statements, IDs and contracts, which are exactly the files people most often need to shrink.",
        ],
      },
    ],
    faq: [
      { q: "Why did my PDF barely get smaller?", a: "PDFs made from typed text are already compact. Big reductions come from scans and photos. Try Balanced or Smallest if the text doesn't need to stay selectable." },
      { q: "Can I compress a PDF to a specific size, like 200 KB?", a: "Pick Smallest for the lowest size. For an exact target, it often works better to compress the original photos to a size with Compress image and then make the PDF with Images to PDF." },
    ],
  },

  "pdf-to-jpg": {
    howTo: "How to convert PDF pages to JPG",
    steps: [
      "Drop a PDF into the box above.",
      "Choose all pages, or Pick pages and type them (for example 1-3, 5).",
      "Pick the quality: Standard (150 dpi) for screens and uploads, or High (300 dpi) for printing. Choose JPG or PNG.",
      "Convert and download. One page gives one image; several pages come as a ZIP.",
    ],
    sections: [
      {
        h: "Why turn a PDF into images",
        p: [
          "Some websites and apps accept only images, not PDFs: profile uploads, social posts, slide thumbnails and many chat apps. Converting the page you need to a JPG makes it shareable anywhere.",
          "PNG is better for pages with sharp lines and small text, like diagrams and screenshots. JPG makes smaller files and suits photos and scanned pages.",
        ],
      },
      {
        h: "Getting sharp results",
        p: [
          "Standard resolution matches what you see on a normal screen and keeps files small. Use High when the image will be printed or zoomed, for example a certificate or a poster page. High-resolution images are about four times larger.",
        ],
      },
      {
        h: "Nothing is uploaded",
        p: [
          "Pages are drawn into images by your browser. Your PDF never leaves your device.",
        ],
      },
    ],
    faq: [
      { q: "Can I turn the images back into a PDF?", a: "Yes. Use Images to PDF to combine images into a single PDF in the order you choose." },
    ],
  },

  "organize-pdf": {
    howTo: "How to rearrange, rotate and delete PDF pages",
    steps: [
      "Drop one PDF into the box above. Every page appears as a thumbnail.",
      "Drag pages into a new order, or use the arrow buttons under each page (easiest on a phone).",
      "Rotate sideways or upside-down pages, and remove the pages you don't need.",
      "Save the new PDF and download it.",
    ],
    sections: [
      {
        h: "Reorder PDF pages for free",
        p: [
          "Scanners and phones often save pages in the wrong order, especially double-sided documents. Seeing every page as a picture makes it quick to drag them back into place, without having to count page numbers.",
          "Deleting blank pages, duplicates and scanner cover sheets at the same time leaves you with a clean file that's also a little smaller.",
        ],
      },
      {
        h: "Rotating without losing quality",
        p: [
          "Rotation is saved as a setting on each page, so text and images are not redrawn. The page looks exactly the same, just the right way up.",
        ],
      },
      {
        h: "Related tools",
        p: [
          "To pull pages out into a separate file, use Split PDF. To add pages from another document, merge the files first with Merge PDF, then organize the result.",
        ],
      },
    ],
    faq: [
      { q: "Can I undo a change before saving?", a: "Yes. Nothing is final until you save the new PDF; your original file stays unchanged either way." },
    ],
  },

  "add-page-numbers": {
    howTo: "How to add page numbers to a PDF",
    steps: [
      "Drop your PDF into the box above.",
      "Pick the position: top or bottom, left, center or right.",
      "Choose the size and the number to start from, and turn on Skip the first page if you have a cover page.",
      "Add the numbers and download the numbered PDF.",
    ],
    sections: [
      {
        h: "Where page numbers usually go",
        p: [
          "Bottom center is the most common choice for essays, reports and theses. Courts, offices and printers sometimes ask for bottom right or top right. If the instructions don't say, bottom center is a safe default.",
          "Skipping the first page leaves a title page or cover letter clean while numbering starts on page 2, as most style guides expect.",
        ],
      },
      {
        h: "Works with mixed and rotated pages",
        p: [
          "Numbers are placed according to how each page looks when opened, so landscape and rotated pages get their number in the right corner. Page sizes are never changed.",
        ],
      },
      {
        h: "Numbering several documents together",
        p: [
          "To number a bundle continuously, merge the documents first with Merge PDF and then add numbers to the merged file.",
        ],
      },
    ],
  },

  "watermark-pdf": {
    howTo: "How to add a watermark to a PDF",
    steps: [
      "Drop your PDF into the box above.",
      "Type the watermark text, or pick a common one like DRAFT or CONFIDENTIAL.",
      "Choose the layout (diagonal, straight or repeated), the color and how faint it should be.",
      "Add the watermark and download. It appears on every page.",
    ],
    sections: [
      {
        h: "Why watermark a document",
        p: [
          "A watermark tells readers what a document is and who it belongs to. “DRAFT” stops an unfinished version being mistaken for the final one. “COPY” or your name on an ID or certificate makes it harder to misuse a copy you've sent for one purpose.",
          "For ID documents, a useful habit is to write the purpose and date, for example “For ABC Bank account opening only, Nov 2026”.",
        ],
      },
      {
        h: "Faint or bold",
        p: [
          "A light gray diagonal watermark is readable without getting in the way of the text. Repeated watermarks cover the whole page and are hardest to crop out, which suits sensitive copies.",
        ],
      },
      {
        h: "Keep your original",
        p: [
          "The watermark is drawn into each page, so readers can't switch it off. Readily never changes your original file, so keep it if you'll need a clean copy later.",
        ],
      },
    ],
  },

  "sign-pdf": {
    howTo: "How to sign a PDF online",
    steps: [
      "Drop the PDF you need to sign into the box above.",
      "Create your signature: draw it with a finger or mouse, type your name in a handwriting style, or upload a photo of your signature.",
      "Go to the right page, then drag and resize the signature to sit on the line.",
      "Add it and download the signed PDF. Use Sign again on the result to sign another page.",
    ],
    sections: [
      {
        h: "Signing without printing",
        p: [
          "Printing, signing and scanning a document takes time and lowers its quality. Placing your signature directly on the PDF keeps the text crisp and takes a minute. Many landlords, employers, schools and offices accept signatures added this way for everyday paperwork.",
          "For an uploaded signature, sign on white paper with a dark pen and take the photo in good light. A white background blends into the page.",
        ],
      },
      {
        h: "When you need more than a picture of a signature",
        p: [
          "Some contracts and government forms require a certified electronic signature with identity checks. If the instructions mention a qualified or certified digital signature, use the service they name.",
        ],
      },
      {
        h: "Your signature stays with you",
        p: [
          "Your signature is created and placed in your browser and is not saved anywhere. When you leave the page, it's gone.",
        ],
      },
    ],
  },

  "searchable-pdf": {
    howTo: "How to make a scanned PDF searchable (OCR)",
    steps: [
      "Drop a scanned PDF or photos of pages into the box above.",
      "Choose the language of the text. You can pick two, for example English and Persian.",
      "Start. Readily reads each page on your device; the first run downloads the language data once.",
      "Download the PDF. It looks the same, but you can now search, select and copy its text.",
    ],
    sections: [
      {
        h: "What OCR adds",
        p: [
          "A scanned page is just a picture, so you can't search it or copy from it. Optical character recognition (OCR) reads the words and places an invisible text layer behind the picture. The page looks exactly as before, but Ctrl+F, copy and screen readers now work.",
        ],
      },
      {
        h: "Languages, including right-to-left scripts",
        p: [
          "Over 100 languages are supported, including Persian (Farsi and Dari), Pashto, Arabic and Urdu, which many free OCR tools handle poorly. Choosing the right language matters more than anything else for accuracy.",
        ],
      },
      {
        h: "Tips for better accuracy",
        list: [
          "Scan at 300 dpi or photograph pages straight on in even light",
          "Rotate sideways pages upright first with Organize PDF",
          "For a quick copy of a few lines, Image to text is faster",
          "Turn the result into an editable document with PDF to Word",
        ],
        p: [],
      },
    ],
  },

  "protect-pdf": {
    howTo: "How to password-protect a PDF",
    steps: [
      "Drop the PDF into the box above.",
      "Type a password twice. Use at least 4 characters; longer is much stronger.",
      "Choose whether people who open it may print and copy text.",
      "Protect it and download. Anyone opening the file will be asked for the password.",
    ],
    sections: [
      {
        h: "How strong is it",
        p: [
          "Readily uses AES-256, the strongest encryption in the PDF standard. Without the password the contents can't be read. The weak point is the password itself: a short or common one can be guessed, so use a few unrelated words or a long phrase.",
        ],
      },
      {
        h: "Sharing a protected PDF safely",
        p: [
          "Send the password a different way than the file, for example the file by email and the password by text message. That way one intercepted message isn't enough.",
          "Keep the password somewhere safe. There is no way to recover a forgotten PDF password.",
        ],
      },
      {
        h: "Encrypted on your device",
        p: [
          "The file is encrypted in your browser, so the unprotected version never leaves your device.",
        ],
      },
    ],
  },

  "unlock-pdf": {
    howTo: "How to remove a password from a PDF",
    steps: [
      "Drop the protected PDF into the box above.",
      "Type the password you use to open it.",
      "Unlock and download a copy that opens without a password.",
    ],
    sections: [
      {
        h: "Why remove a password you already know",
        p: [
          "Bank statements, payslips and utility bills are often sent with a password. That's sensible in an email, but annoying when you need to merge, compress, upload or print the file, and many websites reject protected PDFs. Unlocking a copy fixes that.",
        ],
      },
      {
        h: "What it can't do",
        p: [
          "Readily doesn't crack or guess passwords. You need the password, and the tool only saves a copy without it. Only unlock documents that are yours or that you're allowed to use.",
        ],
      },
      {
        h: "Next steps",
        p: [
          "Once unlocked, the file works in every other PDF tool: merge it with other documents, compress it for an upload, or add a new password later with Protect PDF.",
        ],
      },
    ],
  },

  "pdf-to-word": {
    howTo: "How to convert a PDF to Word",
    steps: [
      "Drop the PDF into the box above.",
      "Convert. Readily reads the text, headings and images on your device.",
      "Download the DOCX and open it in Word, Google Docs, Pages or LibreOffice to edit.",
    ],
    sections: [
      {
        h: "What comes across",
        p: [
          "Paragraphs, headings, bold and italic text, lists and images are kept so the document is easy to edit. Very complex layouts, like magazine columns or forms built from many boxes, are simplified into a clean flowing document rather than copied box by box.",
        ],
      },
      {
        h: "Scanned PDFs",
        p: [
          "If you can't select the text in your PDF, it's a scan, so there is no text to convert yet. Run it through Scan to searchable PDF first, then convert the result to Word.",
        ],
      },
      {
        h: "Converted on your device",
        p: [
          "The conversion runs in your browser, so contracts, CVs and reports aren't uploaded anywhere.",
        ],
      },
    ],
  },

  "summarize-pdf": {
    howTo: "How to summarize a PDF with AI",
    steps: [
      "Drop a PDF or text file into the box above.",
      "Readily reads the text on your device and shows how many credits it will use.",
      "Start. The AI writes a short summary with the key points.",
      "Copy it or download it as a text file.",
    ],
    sections: [
      {
        h: "Good for",
        list: [
          "Reports and research papers you need to skim before a meeting",
          "Long contracts and terms, to see the main obligations",
          "Lecture notes and readings before an exam",
          "Deciding whether a document is worth reading in full",
        ],
        p: [],
      },
      {
        h: "How it works and what it sees",
        p: [
          "Only the document's text is sent, never the PDF itself. The summary is written from that text alone, and nothing is kept or used to train AI. Scanned PDFs have no text to read; run them through Scan to searchable PDF first.",
          "A summary helps you find what matters, but for decisions with legal or financial consequences, read the relevant sections yourself. Ask a PDF can answer specific questions and points to the page each answer comes from.",
        ],
      },
    ],
  },

  "chat-with-pdf": {
    howTo: "How to ask questions about a PDF",
    steps: [
      "Drop a PDF or text file into the box above.",
      "Type a question, for example “What is the notice period?” or “Which dates are mentioned?”",
      "Read the answer, which names the page it came from, and check it there if it matters.",
      "Ask follow-up questions about the same document.",
    ],
    sections: [
      {
        h: "Answers you can check",
        p: [
          "Every answer points to its page, so you're never asked to take the AI's word for it. If the document doesn't contain the answer, it says so instead of guessing.",
        ],
      },
      {
        h: "Questions that work well",
        list: [
          "“What does this contract say about cancelling early?”",
          "“List every deadline in this document.”",
          "“What are the eligibility requirements?”",
          "“Explain the conclusion of this paper in simple words.”",
        ],
        p: [],
      },
      {
        h: "Privacy",
        p: [
          "Only the document's text and your question are sent to the AI. Nothing is kept or used for training.",
        ],
      },
    ],
  },

  "translate-document": {
    howTo: "How to translate a PDF document",
    steps: [
      "Drop a PDF or text file into the box above.",
      "Choose the language to translate into. The cost in pages is shown before you start.",
      "Translate. Long documents are translated section by section.",
      "Download the translation as a Word document (DOCX) or plain text, with its paragraphs in place. Right-to-left languages are laid out right to left.",
    ],
    sections: [
      {
        h: "Whole documents, not just sentences",
        p: [
          "Pasting pages into a phrase translator loses the structure and the context. Readily translates the whole document with modern AI, keeping headings and paragraphs, and handling terminology consistently from start to end.",
          "Over 100 languages are supported, including Persian, Dari, Pashto, Arabic, Urdu, Turkish, German, French and Spanish.",
        ],
      },
      {
        h: "Best quality on Premium",
        p: [
          "On Premium you can choose a stronger AI model for legal, medical or technical documents, where tone and precise terms matter most.",
        ],
      },
      {
        h: "Official documents",
        p: [
          "AI translation is excellent for understanding a document and for everyday use. Visa offices and courts often require a certified translator; check before submitting.",
        ],
      },
    ],
  },

  assistant: {
    howTo: "How to get a file done by describing it",
    steps: [
      "Add your files.",
      "Describe the result in plain words, for example “these scans as one PDF under 2 MB” or “resize these photos to 1080 pixels wide”.",
      "Check the steps Readily plans, then run them. The work happens on your device.",
      "Download the finished file.",
    ],
    sections: [
      {
        h: "What it can do",
        p: [
          "The assistant combines Readily's PDF and image tools for you: merging, converting, compressing to a size, resizing, splitting and rotating. It is useful when a task takes several tools in a row and you'd rather not work out the order.",
        ],
      },
      {
        h: "Private by design",
        p: [
          "Only your instruction and the names and sizes of your files are sent to the AI, which plans the steps. The files themselves are processed on your device.",
        ],
      },
    ],
  },
};
