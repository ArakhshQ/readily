import type { ToolSlug } from "../tools";
import type { GuideSection } from "./types";

// More questions and sections for the pages people already find in search
// (from Search Console: trim/cut/crop audio, unmerge PDF, copy text from an image,
// background noise in videos, black and white to color, reorder PDF pages).
export const EXTRA_FAQ: Partial<Record<ToolSlug, { q: string; a: string }[]>> = {
  "trim-audio": [
    { q: "Is there a length or size limit?", a: "No set limit. Long recordings depend on your device's memory; songs, voice notes and hour-long lectures work fine on a computer." },
    { q: "Does trimming lower the quality?", a: "Saving as WAV keeps the trimmed part lossless. MP3 and M4A are re-encoded at high quality, which is indistinguishable for normal listening." },
  ],
  "split-pdf": [
    { q: "Can I split a PDF into single pages?", a: "Yes. Choose Every page and you get one PDF per page in a ZIP, named in page order." },
    { q: "Can I split a large PDF into equal parts?", a: "Yes. Choose Equal parts and set how many pages each part should have. It's an easy way to get under an upload size limit." },
  ],
  "image-to-text": [
    { q: "Can I edit the text after copying it?", a: "Yes. The text appears in an editable box. Fix anything that was misread, then copy it or download it as a text file." },
    { q: "Does it work on screenshots?", a: "Yes. Screenshots of websites, chats and documents usually give very accurate results, because the text is sharp and straight." },
    { q: "Can it read handwriting?", a: "Neat, printed-style handwriting sometimes works, but results vary a lot. It's built for printed and typed text." },
  ],
  "noise-remover": [
    { q: "Can I remove background noise from a video for free?", a: "You can try it free once with a free account. After that it's part of the Basic plan, with unlimited use because it runs on your device." },
    { q: "Which videos work?", a: "MP4, MOV and WebM videos, including phone recordings. Only the sound is changed; the picture stays exactly the same." },
    { q: "Will it remove music from my video?", a: "It focuses on keeping the voice clear, so music behind the voice is reduced too. To separate singing from music, use the Vocal remover." },
  ],
  "colorize-photo": [
    { q: "Is it a black and white to color converter for any photo?", a: "Yes, for photos. It works best on real photographs, like portraits, family pictures, streets and landscapes. Drawings and text documents don't benefit." },
    { q: "Can I colorize a scan of an old print?", a: "Yes. Scan or photograph it straight on without glare. If it's blurry or scratched, use Restore old photos and the Object eraser first." },
  ],
  "organize-pdf": [
    { q: "Can I reorder PDF pages for free?", a: "Yes. Organize PDF is free with no sign-up and no limits, because everything happens in your browser." },
    { q: "Can I delete pages from a PDF?", a: "Yes. Remove any page from the overview, then save the new PDF. Your original file isn't changed." },
  ],
  "crop-image": [{ q: "Can I crop an image to a circle?", a: "Crop to Square 1:1. Profile pictures on most sites are shown as a circle automatically from a square image." }],
  "add-text-to-image": [{ q: "Which fonts can I use?", a: "Bold, Classic, Poster and Handwritten styles, each with outline, background, shadow or plain text, in any color." }],
  "video-upscaler": [{ q: "How long does it take?", a: "Usually a few minutes per minute of video, depending on the length and the target resolution. You can leave the page open and come back to it." }],
  "restore-photo": [{ q: "Will it change the person's face?", a: "It sharpens and recovers detail rather than inventing a new face, but heavily damaged faces can come out slightly different. Compare with the original before sharing." }],
  "voice-changer": [{ q: "Does it keep my timing and emotion?", a: "Yes. The words, pauses and emphasis stay yours; only the voice changes." }],
  "ai-dubbing": [{ q: "Which languages can I dub into?", a: "29, including English, Spanish, French, German, Arabic, Hindi, Turkish, Portuguese, Chinese and Japanese. The full list is in the language menu." }],
};

export const EXTRA_SECTIONS: Partial<Record<ToolSlug, GuideSection[]>> = {
  "trim-audio": [
    {
      h: "Formats you can trim",
      p: [
        "Add MP3, WAV, M4A or OGG files, including phone voice memos and WhatsApp audio saved to your device. Save the result as MP3 to play anywhere, WAV for editing, or M4A for Apple devices.",
      ],
    },
  ],
  "image-to-text": [
    {
      h: "Copy text from an image on your phone",
      p: [
        "On a phone, take a screenshot or photo, open this page in your browser and choose the image. The text appears in a box you can edit, select and copy into a message, note or document.",
      ],
    },
  ],
  "colorize-photo": [
    {
      h: "Restore, then colorize",
      p: [
        "Colorizing works on what's in the photo. If faces are blurry or the print is damaged, first fix scratches with the Object eraser, then sharpen faces with Restore old photos, and colorize the result last.",
      ],
    },
  ],
};
