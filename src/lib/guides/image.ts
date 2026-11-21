import type { Guides } from "./types";

// Written guides for the image tools.
export const IMAGE_GUIDES: Guides = {
  "compress-image": {
    howTo: "How to compress an image to a specific size",
    steps: [
      "Drop one or more photos into the box above.",
      "Choose Target file size and pick a limit, like 50 KB, 100 KB, 200 KB, 500 KB, 1 MB or 2 MB. Or choose Quality level to set the quality yourself.",
      "Pick JPG for the widest support or WebP for even smaller files.",
      "Compress and check the exact size of each result before downloading.",
    ],
    sections: [
      {
        h: "Made for upload limits",
        p: [
          "Job portals, university applications, visa forms and government sites often reject photos and signatures above a size such as 50 KB, 100 KB or 200 KB. Most compressors only offer “low, medium, high” and leave you guessing. Readily works the other way round: you give the limit, and it searches for the best-looking version that stays under it.",
          "If quality alone can't get the file small enough, the dimensions are reduced slightly as well, which keeps the photo looking clean instead of blocky.",
        ],
      },
      {
        h: "Common size limits",
        list: [
          "Passport-style photos for online forms: often 20 to 100 KB",
          "Signatures: often 10 to 50 KB",
          "Scanned documents as images: often 200 KB to 1 MB",
          "Email: keep each photo under 1 to 2 MB so a few fit in one message",
        ],
        p: ["Always aim a little under the stated limit; some sites count sizes slightly differently."],
      },
      {
        h: "Also need exact pixels?",
        p: [
          "Some forms ask for both a size in pixels and a size in KB, for example 600 × 600 px under 100 KB. Resize first with Resize image, then compress the result here.",
        ],
      },
    ],
    faq: [
      { q: "Can I compress many photos at once?", a: "Yes. Add several images and each one is compressed to the same target. Download them one by one or all together as a ZIP." },
      { q: "Will the photo look worse?", a: "At sensible targets the difference is hard to see on screen. Very small targets, like 20 KB for a large photo, will soften details; resizing to smaller dimensions first gives a sharper result." },
    ],
  },

  "resize-image": {
    howTo: "How to resize an image in pixels",
    steps: [
      "Drop one or more images into the box above.",
      "Choose Exact pixels, Percentage, or a ready-made size such as Passport 600 × 600, Profile 400 × 400, Square post 1080 × 1080, Portrait post 1080 × 1350, Story 1080 × 1920 or Full HD.",
      "If the new shape differs from your photo, pick Crop to fill, Fit with border or Stretch.",
      "Resize and download.",
    ],
    sections: [
      {
        h: "Crop, fit or stretch?",
        p: [
          "Crop to fill gives the exact size with no borders by trimming the edges. It's the right choice for profile pictures, passport photos and social posts.",
          "Fit with border keeps the whole picture and adds white space around it. Use it for product photos and documents where nothing may be cut off. Stretch is rarely the right choice, because it distorts faces and text.",
        ],
      },
      {
        h: "Sizes for social media",
        list: [
          "Instagram square post: 1080 × 1080",
          "Instagram portrait post: 1080 × 1350",
          "Stories, Reels and TikTok covers: 1080 × 1920",
          "YouTube thumbnail and wide images: 1920 × 1080 or 1280 × 720",
        ],
        p: [],
      },
      {
        h: "Resize vs compress",
        p: [
          "Resizing changes the width and height. Compressing changes the file size. A smaller image is also a smaller file, but if a form gives a limit in KB, run the result through Compress image too.",
        ],
      },
    ],
  },

  "convert-image": {
    howTo: "How to convert images to JPG, PNG or WebP",
    steps: [
      "Drop your images into the box above. JPG, PNG, WebP, GIF and BMP all work.",
      "Choose the format to convert to: JPG, PNG or WebP.",
      "Convert and download, one by one or all together as a ZIP.",
    ],
    sections: [
      {
        h: "Which format is right",
        p: [
          "JPG is the safe choice for photos: every phone, computer and website accepts it. PNG keeps sharp edges and transparent backgrounds, so it suits logos, icons and screenshots. WebP makes noticeably smaller files at the same quality and works in all modern browsers, though some older apps and upload forms still refuse it.",
        ],
      },
      {
        h: "Common conversions",
        list: [
          "WebP to JPG, when a website or app won't accept a WebP you saved",
          "PNG to JPG, to make large screenshots much smaller",
          "JPG to PNG, when a tool asks for PNG",
          "JPG or PNG to WebP, to speed up your own website",
        ],
        p: [],
      },
      {
        h: "iPhone photos",
        p: [
          "For HEIC photos from an iPhone, use HEIC to JPG, which works in every browser.",
        ],
      },
    ],
  },

  "heic-to-jpg": {
    howTo: "How to convert HEIC to JPG",
    steps: [
      "Drop your iPhone HEIC or HEIF photos into the box above. You can add many at once.",
      "Choose JPG (smaller, works everywhere) or PNG (lossless).",
      "Convert and download them one by one, or all together as a ZIP.",
    ],
    sections: [
      {
        h: "Why iPhone photos won't open",
        p: [
          "iPhones save photos as HEIC to save space. Windows, many websites, upload forms and older apps can't open HEIC, so the photo shows as an unknown file or gets rejected. Converting to JPG makes it work everywhere.",
        ],
      },
      {
        h: "Works on Windows, Android and Chromebook",
        p: [
          "The converter runs in your browser, so you don't need to install anything. The first conversion downloads a small converter once, after which it's fast even for large batches.",
        ],
      },
      {
        h: "Stop getting HEIC files",
        p: [
          "On an iPhone, Settings > Camera > Formats > Most Compatible makes the camera save JPG from now on. Settings > Photos > Transfer to Mac or PC > Automatic converts photos when you copy them to a computer.",
        ],
      },
    ],
  },

  "crop-image": {
    howTo: "How to crop an image",
    steps: [
      "Drop one image into the box above.",
      "Pick a shape: Free, Square 1:1, Portrait 4:5, 3:4, Wide 16:9 or Story 9:16.",
      "Drag inside the box to move it and drag a corner to resize it.",
      "Crop and download at full resolution.",
    ],
    sections: [
      {
        h: "Which shape to use",
        list: [
          "Square 1:1: profile pictures and Instagram posts",
          "Portrait 4:5: Instagram posts that take up more of the feed",
          "Wide 16:9: YouTube thumbnails, presentations and desktop wallpapers",
          "Story 9:16: Stories, Reels, TikTok and phone wallpapers",
        ],
        p: [],
      },
      {
        h: "Full quality kept",
        p: [
          "Cropping keeps the remaining area at its original resolution. If you also need an exact pixel size, like 400 × 400, follow up with Resize image.",
        ],
      },
    ],
  },

  "add-text-to-image": {
    howTo: "How to add text to a photo",
    steps: [
      "Drop one photo into the box above.",
      "Type your text. Press Enter for a new line.",
      "Pick a font, style (outline, background, shadow or plain), size and color.",
      "Drag the text on the preview to place it, then download at full resolution.",
    ],
    sections: [
      {
        h: "Making text easy to read",
        p: [
          "Text on busy photos is hard to read. An outline or a background box keeps words clear on any picture, which is why memes and video thumbnails use them. White text with a dark outline works on almost everything.",
          "Keep it short: a few large words read better on a phone than a long sentence.",
        ],
      },
      {
        h: "Ideas",
        list: [
          "Captions and quotes for social posts",
          "Titles on thumbnails and event flyers",
          "Labels on product photos and screenshots",
          "Names and dates on photos for invitations",
        ],
        p: [],
      },
    ],
  },

  "image-to-text": {
    howTo: "How to copy text from an image",
    steps: [
      "Drop a photo, screenshot or scanned PDF into the box above.",
      "Start. Readily reads the text on your device; the first use downloads the reading engine once.",
      "Copy the text from the box, edit it, or download it as a text file.",
    ],
    sections: [
      {
        h: "Grab text instead of retyping it",
        p: [
          "Optical character recognition (OCR) turns the words in a picture into real text you can copy, edit, search and paste. It saves retyping quotes from a book, numbers from a receipt, an address from a screenshot or notes from a whiteboard.",
        ],
      },
      {
        h: "Tips for accurate results",
        list: [
          "Use a sharp photo taken straight on, in even light",
          "Crop to just the text with Crop image",
          "Printed text works far better than handwriting",
          "Check numbers and names, where one wrong letter matters",
        ],
        p: [],
      },
      {
        h: "Need the text inside the PDF?",
        p: [
          "To keep a scanned document as a PDF but make it searchable, use Scan to searchable PDF, which also supports over 100 languages including Persian and Arabic.",
        ],
      },
    ],
  },

  "remove-background": {
    howTo: "How to remove the background from an image",
    steps: [
      "Drop one or more photos into the box above.",
      "Choose the new background: Transparent (PNG), White (JPG) or a color of your choice.",
      "Start. The AI finds the main subject and cuts it out on your device.",
      "Check the result and download.",
    ],
    sections: [
      {
        h: "What people use it for",
        list: [
          "Product photos on white for online shops and marketplaces",
          "Profile and ID-style photos with a plain background",
          "Cut-outs for stickers, thumbnails and designs",
          "Signatures and logos on transparent backgrounds",
        ],
        p: [],
      },
      {
        h: "Getting a clean edge",
        p: [
          "The cut-out is cleanest when the subject stands out from the background in color or brightness and is in focus. Fine hair and see-through objects are the hardest parts for any background remover.",
          "To put the subject in a realistic new scene, rather than a plain color, try AI product backgrounds.",
        ],
      },
      {
        h: "Runs on your device",
        p: [
          "The AI model runs in your browser, so your photos are never uploaded.",
        ],
      },
    ],
  },

  "upscale-image": {
    howTo: "How to upscale an image with AI",
    steps: [
      "Drop a small or blurry photo into the box above (up to 2,000 pixels on the longest side).",
      "Choose 2x or 4x bigger.",
      "Start. The AI rebuilds detail on your device.",
      "Compare and download the larger image.",
    ],
    sections: [
      {
        h: "AI upscaling vs normal resizing",
        p: [
          "Enlarging a photo the normal way just stretches its pixels, so it looks soft or blocky. An AI upscaler has learned what edges, textures and text look like and redraws them at the new size, so the result is sharper.",
        ],
      },
      {
        h: "When to use it",
        list: [
          "Small images saved from websites or messages",
          "Photos you want to print larger",
          "Old low-resolution digital photos",
          "Thumbnails and logos you need bigger",
        ],
        p: ["For print-quality 4x enlargements with face repair, use the HD photo upscaler."],
      },
    ],
  },

  "object-eraser": {
    howTo: "How to remove objects from a photo",
    steps: [
      "Drop one photo into the box above.",
      "Paint over the person, object, text or blemish you want gone. Cover it completely, with a little margin.",
      "Press Erase. The area is filled in to match its surroundings.",
      "Repeat for anything left, undo if needed, then download.",
    ],
    sections: [
      {
        h: "What it removes well",
        list: [
          "People and tourists in the background",
          "Power lines, signs, bins and cars",
          "Text, date stamps and small logos",
          "Spots, dust and small scratches",
        ],
        p: [
          "It works best when the area behind the object is simple, like sky, grass, a wall or the sea. Large objects in front of detailed backgrounds are harder; erase them in a few smaller strokes.",
        ],
      },
      {
        h: "Brush, not a prompt",
        p: [
          "You show exactly what to remove by painting over it, so nothing else in the photo changes. If you'd rather describe a change in words, such as “remove the people and make the sky blue”, use the AI photo editor.",
        ],
      },
    ],
  },

  "hd-photo-upscaler": {
    howTo: "How to upscale a photo to HD for printing",
    steps: [
      "Drop one photo into the box above.",
      "Choose whether to fix faces. Turn it on for portraits; leave it off for landscapes and products.",
      "Start. The photo is upscaled 4x on a powerful GPU.",
      "Download the large, sharp result.",
    ],
    sections: [
      {
        h: "Made for prints and big screens",
        p: [
          "Printing needs far more pixels than a screen. A phone photo cropped tightly, or an image saved from social media, often looks soft when printed as a poster or canvas. A 4x upscale gives sixteen times as many pixels, rebuilt with a large AI model rather than stretched.",
        ],
      },
      {
        h: "Face repair",
        p: [
          "Faces are where blurriness is most noticeable. With face repair on, eyes, skin and hair are sharpened with a model trained on faces. For old, damaged family photos, Restore old photos is the better first step.",
        ],
      },
    ],
  },

  "restore-photo": {
    howTo: "How to restore an old photo",
    steps: [
      "Scan or photograph the old print straight on, in even light, without glare.",
      "Drop it into the box above.",
      "Start. The AI sharpens faces and recovers detail.",
      "Download the restored photo, and colorize it next if it's black and white.",
    ],
    sections: [
      {
        h: "Bring family photos back",
        p: [
          "Old prints fade, blur and lose detail, and scans of them often look soft. Restoration uses AI trained on faces to bring back eyes, expressions and fine detail, and doubles the sharpness of the whole picture.",
        ],
      },
      {
        h: "For the best result",
        list: [
          "Scan prints at 600 dpi if you can; a phone photo works too",
          "Remove scratches and tears first with the Object eraser",
          "Then restore, then colorize, in that order",
        ],
        p: [],
      },
    ],
  },

  "colorize-photo": {
    howTo: "How to convert a black and white photo to color",
    steps: [
      "Drop a black and white photo into the box above.",
      "Start. The AI predicts natural colors for skin, sky, clothes and plants.",
      "Download the colorized photo.",
    ],
    sections: [
      {
        h: "How AI colorizing works",
        p: [
          "The AI has seen millions of color photos and learned what colors things usually are: skies, faces, trees, fabrics, wood. It uses that to add believable, natural color to a black and white picture.",
          "The colors are a well-informed guess, not a record of the past. Clothing and painted objects may come out a different color than they really were.",
        ],
      },
      {
        h: "Tips",
        list: [
          "Restore blurry or damaged photos first, then colorize the restored version",
          "Clear, well-exposed scans give more natural color",
          "Portraits and outdoor scenes give the most convincing results",
        ],
        p: [],
      },
    ],
  },

  "ai-photo-editor": {
    howTo: "How to edit a photo by describing the change",
    steps: [
      "Drop one photo into the box above.",
      "Describe the change in a sentence. Say what to change and where, for example “remove the man in the red jacket on the left”.",
      "Confirm you have the right to edit the photo, then start.",
      "Compare the result and download it.",
    ],
    sections: [
      {
        h: "Writing a good edit request",
        p: [
          "Be specific. “Remove the bin on the right of the door” works much better than “clean it up”. Name the object, where it is, and what should replace it if that matters (“replace the sky with a clear blue sky”).",
          "Ask for one or two changes at a time. Everything you don't mention is kept as it is, including people, faces and framing.",
        ],
      },
      {
        h: "Things you can ask for",
        list: [
          "Remove people, objects or text",
          "Change the sky, the weather or the time of day",
          "Change colors, like a wall or a car",
          "Restyle the scene, like a watercolor or film look",
          "Tidy a room or a desk",
        ],
        p: [
          "Edits are made with Google's Nano Banana Pro model at 2K resolution. For erasing a small object exactly, the free Object eraser is often quicker.",
        ],
      },
      {
        h: "Use it honestly",
        p: [
          "Don't create fake documents or misleading images of real people. Edit photos you own or have permission to change.",
        ],
      },
    ],
  },

  "product-photo-backgrounds": {
    howTo: "How to change a product photo background",
    steps: [
      "Photograph your product on any plain surface, and drop the photo into the box above.",
      "Pick a scene: clean white studio, marble counter, wooden table, outdoors, festive or pastel. Or describe your own.",
      "Start. The product is kept and the scene around it is replaced.",
      "Download and use it in your shop, ads or posts.",
    ],
    sections: [
      {
        h: "Studio-style photos without a studio",
        p: [
          "Good product photos sell, but studio shoots are expensive. Take a clear photo at home, then place the product on a realistic backdrop with natural light and shadow. A white studio background suits marketplaces; lifestyle scenes like a kitchen counter or a wooden table suit social media and ads.",
        ],
      },
      {
        h: "Tips for the best result",
        list: [
          "Shoot in daylight, with the whole product in frame and in focus",
          "Avoid strong reflections and busy backgrounds behind the product",
          "Make several versions with different scenes to test in ads",
          "Check labels and small text on the product before publishing",
        ],
        p: [],
      },
    ],
  },
};
