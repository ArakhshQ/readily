import type { Guides } from "./types";

// Written guides for the video, audio and writing tools.
export const MEDIA_GUIDES: Guides = {
  "trim-video": {
    howTo: "How to trim a video online",
    steps: [
      "Drop one MP4, MOV or WebM video into the box above.",
      "Play it and set where the clip should start and end.",
      "Choose Fast, original quality (instant, no quality loss) or Exact cut (frame-accurate, takes longer).",
      "Trim and download the shorter clip.",
    ],
    sections: [
      {
        h: "Fast cut or exact cut?",
        p: [
          "Fast, original quality copies the video without re-encoding it, so it finishes in seconds and looks identical to the original. Because videos can only be cut cleanly at certain frames, the start may land a second or two from the exact time you chose.",
          "Exact cut re-encodes the clip so it starts and ends on exactly the frame you set. Use it for tight edits, like a reaction or a punchline, and the fast cut for everything else.",
        ],
      },
      {
        h: "Why trim before anything else",
        p: [
          "Trimming first makes every next step faster and smaller: compressing, resizing for social media, converting to MP3 or adding subtitles all work on less video. A shorter clip also fits messaging apps' size limits more easily.",
        ],
      },
      {
        h: "No upload, no watermark",
        p: [
          "The video is cut in your browser and never uploaded, and no watermark is added. The first use downloads the video engine once, about 30 MB.",
        ],
      },
    ],
  },

  "compress-video": {
    howTo: "How to compress a video",
    steps: [
      "Drop one MP4, MOV or WebM video into the box above.",
      "Choose the quality: High (1080p), Balanced (720p) or Smallest (480p).",
      "Compress, and keep the tab open while your device works.",
      "Check the new size and download the MP4.",
    ],
    sections: [
      {
        h: "Which setting to use",
        list: [
          "Balanced (720p): WhatsApp, email, Discord and most uploads; looks sharp on phones",
          "High (1080p): when quality matters more than size, like a portfolio",
          "Smallest (480p): strict limits, like small email attachments or old phones",
        ],
        p: [
          "Phone videos are recorded at a very high bitrate, so even High usually makes them much smaller without a visible difference.",
        ],
      },
      {
        h: "Make it faster",
        p: [
          "Compressing is heavy work and happens on your own device, so a one-minute video takes one to a few minutes. Trimming the parts you don't need first is the best way to save time and size. A computer is faster than a phone for long videos.",
        ],
      },
      {
        h: "Private",
        p: [
          "Your video never leaves your device, which matters for personal and family videos.",
        ],
      },
    ],
  },

  "resize-video": {
    howTo: "How to resize a video for Reels, TikTok and Shorts",
    steps: [
      "Drop one video into the box above.",
      "Pick the shape: vertical 9:16, square 1:1, portrait 4:5 or wide 16:9.",
      "Choose how to fill the space: blurred background, black bars, or crop to fill.",
      "Resize and download the MP4, ready to post.",
    ],
    sections: [
      {
        h: "Shapes for each platform",
        list: [
          "9:16 vertical: Instagram Reels and Stories, TikTok, YouTube Shorts, Snapchat",
          "4:5 portrait: Instagram and Facebook feed posts",
          "1:1 square: feed posts on most platforms",
          "16:9 wide: YouTube, LinkedIn and presentations",
        ],
        p: [],
      },
      {
        h: "Blurred background, bars or crop",
        p: [
          "A wide video in a vertical frame leaves empty space. Blurred background fills it with a soft, blurred copy of the video, the look most creators use. Black bars keep it simple. Crop to fill removes the bars by cutting off the sides, which works when the action is in the middle.",
        ],
      },
    ],
  },

  "merge-videos": {
    howTo: "How to merge videos into one",
    steps: [
      "Drop two or more videos into the box above.",
      "Put them in order with the arrows.",
      "Merge, and keep the tab open while the clips are joined on your device.",
      "Download one MP4 with all the clips back to back.",
    ],
    sections: [
      {
        h: "Clips of different sizes",
        p: [
          "Clips from different phones and apps often have different shapes. Each clip is fitted into the same frame with black bars where needed, so nothing is stretched or cut off. Clips without sound are joined too, with silence for their part.",
          "If the merged video is for social media, resize it afterwards with Resize video for social media.",
        ],
      },
      {
        h: "Good for",
        list: [
          "Joining several short phone clips from one event",
          "Putting an intro or outro before and after a video",
          "Combining parts of a recording that was split",
        ],
        p: [],
      },
    ],
  },

  "video-to-mp3": {
    howTo: "How to convert a video to MP3",
    steps: [
      "Drop one MP4, MOV or WebM video into the box above.",
      "Pick the quality: 128 kbps for speech, 192 kbps for music, or 320 kbps for the best quality.",
      "Convert and download the MP3.",
    ],
    sections: [
      {
        h: "Why extract the audio",
        p: [
          "An MP3 is a fraction of the size of a video and plays anywhere: in the car, on a phone while the screen is off, or in any music app. It's the easy way to keep a lecture, sermon, podcast recording or song from a video you made.",
        ],
      },
      {
        h: "Next steps",
        list: [
          "Cut it to the part you need with Trim audio",
          "Turn the speech into text with Transcribe",
          "Clean up background noise with the Voice noise remover",
        ],
        p: ["Only convert videos you own or have permission to use."],
      },
    ],
  },

  "convert-audio": {
    howTo: "How to convert audio to MP3, WAV or M4A",
    steps: [
      "Drop your audio files into the box above. MP3, WAV, M4A, OGG, FLAC and voice memos all work.",
      "Choose the format: MP3, WAV or M4A, and the quality for MP3.",
      "Convert and download.",
    ],
    sections: [
      {
        h: "Which format to pick",
        p: [
          "MP3 plays on everything and keeps files small. WAV is uncompressed, large and lossless, which audio editors and some upload forms require. M4A sounds slightly better than MP3 at the same size and is the native format on Apple devices.",
          "Converting can't add quality that isn't there: turning a low-quality MP3 into WAV makes a bigger file, not a better sound.",
        ],
      },
      {
        h: "Common uses",
        list: [
          "WAV to MP3, to email or share a recording",
          "M4A voice memos to MP3, for apps that don't accept M4A",
          "FLAC or OGG to MP3, for older players and car stereos",
        ],
        p: [],
      },
    ],
  },

  "trim-audio": {
    howTo: "How to trim, cut or crop an MP3",
    steps: [
      "Drop one MP3, WAV, M4A or OGG file into the box above.",
      "Play it and press Use current time at the start of the part you want; do the same at the end. You can also type the times.",
      "Turn on the fade if you want it to start and end gently.",
      "Choose MP3, WAV or M4A, then trim and download.",
    ],
    sections: [
      {
        h: "Cut a song, voice note or recording",
        p: [
          "Trimming keeps the part between the start and end you choose and removes the rest. People also call this cutting or cropping audio. It's how you make a ringtone from a song, take the useful minute out of a long voice note, or remove the silence and setup at the start of a recording.",
        ],
      },
      {
        h: "Make a ringtone",
        p: [
          "Pick the best 20 to 30 seconds, turn on the fade so it doesn't start abruptly, and save as MP3 for Android. For iPhone, save as M4A and rename the file's ending from .m4a to .m4r before adding it with GarageBand or your computer.",
        ],
      },
      {
        h: "Free, private and no sign-up",
        p: [
          "The audio is cut in your browser, so nothing is uploaded and there's no limit on how often you use it. To cut pauses throughout a whole recording automatically, use Remove silences.",
        ],
      },
    ],
    faq: [
      { q: "Is trimming audio the same as cutting or cropping it?", a: "Yes. Trim, cut and crop all mean keeping one part of the recording and removing the rest." },
      { q: "Can I trim the sound of a video?", a: "Convert the video to MP3 first with Video to MP3, then trim it here. To shorten the video itself, use Trim video." },
    ],
  },

  "noise-remover": {
    howTo: "How to remove background noise from audio and video",
    steps: [
      "Drop one audio file or video into the box above.",
      "Choose how much to remove: Natural keeps some room sound, Strong removes as much as possible.",
      "Start. The AI cleans the voice on your device.",
      "Download. For videos, you get the same video with clean sound.",
    ],
    sections: [
      {
        h: "What it removes",
        list: [
          "Traffic, wind and street noise",
          "Fans, air conditioning and computer hum",
          "Room hiss and electrical buzz",
          "Background chatter, reduced so the main voice stands out",
        ],
        p: [
          "The model is trained for speech, so it works best on talking: interviews, lectures, vlogs, voice notes and online meetings.",
        ],
      },
      {
        h: "Videos keep their picture",
        p: [
          "For a video, only the sound is cleaned and put back. The picture is copied as it is, so the quality stays the same and it finishes faster.",
        ],
      },
      {
        h: "Need more than noise removal?",
        p: [
          "If the voice also sounds echoey or thin, like a phone recording in a big room, the Studio voice enhancer rebuilds the voice itself to sound like it was recorded with a good microphone.",
        ],
      },
    ],
  },

  "remove-silence": {
    howTo: "How to remove silences from audio and video",
    steps: [
      "Drop one audio file or video into the box above.",
      "Choose which pauses to cut: longer than ½ second, 1 second or 2 seconds.",
      "Tell Readily what counts as silence: very quiet only, normal, or some background noise.",
      "Start and download the tighter recording.",
    ],
    sections: [
      {
        h: "Shorter recordings, same content",
        p: [
          "Lectures, voice notes, podcasts and talking-head videos are full of pauses. Cutting them often makes a recording noticeably shorter without losing a word, which makes it quicker to listen to and easier to edit.",
          "A short gap is kept at every cut so speech still sounds natural, and only pauses longer than the length you choose are removed.",
        ],
      },
      {
        h: "Choosing the settings",
        p: [
          "Start with Normal and 1 second. If background noise stops pauses being detected, choose Some background noise. If cuts feel too tight, use 2 seconds.",
        ],
      },
    ],
  },

  "studio-voice": {
    howTo: "How to make a voice recording sound studio quality",
    steps: [
      "Drop one audio file or video into the box above.",
      "On Premium, choose Studio quality for the strongest engine.",
      "Start. The AI rebuilds the voice on Readily's servers.",
      "Download the enhanced recording.",
    ],
    sections: [
      {
        h: "Beyond noise removal",
        p: [
          "Noise removal takes sounds away. Voice enhancement rebuilds the voice itself: it removes echo from big rooms, fills out thin phone and laptop recordings, and evens out the tone, so it sounds like it was recorded with a good microphone in a quiet room.",
        ],
      },
      {
        h: "Good for",
        list: [
          "Podcasts and interviews recorded on phones",
          "Online lectures and course videos",
          "Voice-overs recorded at home",
          "Meeting recordings you need to share",
        ],
        p: [],
      },
    ],
  },

  "auto-subtitles": {
    howTo: "How to add subtitles to a video automatically",
    steps: [
      "Drop one video into the box above.",
      "Start. Only the sound is sent for transcription; the picture stays on your device.",
      "Download the subtitles as SRT or VTT, or an MP4 with the subtitles included.",
    ],
    sections: [
      {
        h: "Why subtitles matter",
        p: [
          "Most social videos are watched with the sound off, and subtitles keep viewers watching. They also make videos accessible to people who are deaf or hard of hearing, and to viewers watching in a second language.",
        ],
      },
      {
        h: "Which file to use",
        list: [
          "SRT: YouTube, Facebook, LinkedIn and most video editors",
          "VTT: websites and online course platforms",
          "MP4 with subtitles: a video with a subtitle track viewers can switch on",
        ],
        p: [
          "Read through the subtitles before publishing; names and specialist terms are where any speech recognition is most likely to slip.",
        ],
      },
    ],
  },

  transcribe: {
    howTo: "How to transcribe audio and video to text",
    steps: [
      "Drop one audio file or video into the box above.",
      "Start. The sound is converted to a compact file on your device, then transcribed. The language is detected automatically.",
      "Copy the transcript, or download it as text or as SRT and VTT subtitles with timestamps.",
    ],
    sections: [
      {
        h: "Good for",
        list: [
          "Lectures and classes, to study from text",
          "Interviews for articles and research",
          "Meetings, for notes and minutes",
          "Voice notes you'd rather read than listen to",
        ],
        p: [],
      },
      {
        h: "Over 90 languages",
        p: [
          "The language is detected automatically, including English, Persian, Arabic, Urdu, Turkish, Spanish and French. Clear recordings with one person speaking at a time give the most accurate transcripts; cleaning noisy audio with the Voice noise remover first can help.",
          "To turn a long transcript into key points, download it as text and drop the file into Summarize PDF.",
        ],
      },
    ],
  },

  "grammar-checker": {
    howTo: "How to check grammar and spelling",
    steps: [
      "Paste your text into the box, or add a TXT or PDF file.",
      "Start. The cost is shown first: 1 credit per 400 words.",
      "Read the corrected text and the list of every change, each with a short reason.",
      "Copy the corrected text, or download it as a text or Word file.",
    ],
    sections: [
      {
        h: "Fixes mistakes, keeps your voice",
        p: [
          "The checker corrects grammar, spelling and punctuation without rewriting your style or meaning. Every change is listed with the reason, so you learn from it and can ignore any change you disagree with.",
          "It works in most languages, including English, Spanish, French, German, Persian, Arabic and Turkish, and answers in the language of your text.",
        ],
      },
      {
        h: "Good for",
        list: [
          "Emails, cover letters and applications",
          "Essays and reports before you hand them in",
          "Writing in a second language",
          "Social posts and website text",
        ],
        p: ["To change the wording or tone rather than fix mistakes, use the Paraphraser."],
      },
    ],
  },

  paraphraser: {
    howTo: "How to paraphrase text",
    steps: [
      "Paste your text into the box, or add a TXT or PDF file.",
      "Pick a style: Fluent, Simpler, Shorter, Formal or Friendly.",
      "Start and read the rewritten version.",
      "Copy it or download it.",
    ],
    sections: [
      {
        h: "Which style to choose",
        list: [
          "Fluent: smoother wording that reads naturally",
          "Simpler: plain words and shorter sentences, easier to understand",
          "Shorter: the same points in fewer words",
          "Formal: for applications, reports and official emails",
          "Friendly: warmer and more relaxed, for messages and posts",
        ],
        p: [],
      },
      {
        h: "Keeps your facts",
        p: [
          "Names, numbers and quotes are kept as they are; only the wording changes. Rewording someone else's work doesn't make it yours, so cite your sources in schoolwork as usual.",
        ],
      },
    ],
  },

  "vocal-remover": {
    howTo: "How to remove vocals from a song",
    steps: [
      "Drop a song or a video into the box above.",
      "Choose what to keep: Music only for a karaoke or instrumental track, or Vocals only for an acapella.",
      "Start. The AI separates the voice from the instruments.",
      "Download the MP3.",
    ],
    sections: [
      {
        h: "Karaoke tracks and acapellas",
        p: [
          "AI source separation has learned what voices and instruments sound like, so it can split a finished song into the singing and everything else. The music-only track is ready for karaoke or for practising your own vocals; the vocals-only track helps singers learn a part, or musicians make covers and remixes.",
        ],
      },
      {
        h: "Personal use",
        p: [
          "Use it freely for practice and personal projects. Publishing or selling tracks made from someone else's music needs the rights holder's permission.",
        ],
      },
    ],
  },

  "ai-voiceover": {
    howTo: "How to turn text into a voiceover",
    steps: [
      "Paste or type your script, up to 10,000 characters.",
      "Choose a voice and listen to the preview.",
      "Generate the speech and download the audio.",
    ],
    sections: [
      {
        h: "Natural, expressive voices",
        p: [
          "Modern AI voices breathe, pause and change tone like a person, which old robotic text-to-speech never did. They suit narration for videos, explainer and training content, presentations and audio versions of articles.",
        ],
      },
      {
        h: "Writing for the ear",
        list: [
          "Use short sentences and commas where you'd pause",
          "Spell out numbers and abbreviations the way they should be read",
          "Write names phonetically if they come out wrong",
          "Generate a short test before the full script",
        ],
        p: ["On Premium, you can use voiceovers commercially in your own videos, ads and products."],
      },
    ],
  },

  "voice-changer": {
    howTo: "How to change the voice in a recording",
    steps: [
      "Drop your recording or video into the box above.",
      "Pick a voice from the library.",
      "Confirm you have permission to use the recording, then start.",
      "Download the recording in the new voice.",
    ],
    sections: [
      {
        h: "Same delivery, different voice",
        p: [
          "Unlike text-to-speech, a voice changer keeps your timing, emotion and emphasis and only changes who it sounds like. That makes it good for narrating in a consistent voice, keeping your own voice private in content, or voicing characters.",
        ],
      },
      {
        h: "Used responsibly",
        p: [
          "You can only choose from Readily's library of AI voices, not copy a real person's voice. Use your own recordings, or recordings you have permission to use.",
        ],
      },
    ],
  },

  "ai-dubbing": {
    howTo: "How to dub a video into another language",
    steps: [
      "Drop a video or audio file of up to 10 minutes into the box above.",
      "Choose the language to dub into.",
      "Confirm you own the recording or have permission, then start.",
      "Download the dubbed version, spoken in a voice like the original.",
    ],
    sections: [
      {
        h: "Reach viewers in their language",
        p: [
          "Dubbing translates the speech and speaks it again in the new language, in a voice that sounds like the original speaker. Viewers can watch without reading subtitles, which suits courses, explainers, product videos and social content.",
        ],
      },
      {
        h: "Tips",
        list: [
          "Clear speech with little music behind it dubs best",
          "Ask a native speaker to check important videos before publishing",
          "For a written translation instead, use Auto subtitles and Translate documents",
        ],
        p: [],
      },
    ],
  },

  "video-background-remover": {
    howTo: "How to remove the background from a video",
    steps: [
      "Drop a video of a person into the box above.",
      "Confirm you have permission from the people in it, then start.",
      "Download the video with the person on a solid green background.",
      "Use chroma key (green screen) in any editor to place them on any background.",
    ],
    sections: [
      {
        h: "A green screen without a green screen",
        p: [
          "The AI separates the person from everything behind them in every frame, and replaces the background with solid green. Every video editor, including CapCut, Premiere, DaVinci Resolve and iMovie, can then swap that green for any image or video in one step.",
        ],
      },
      {
        h: "For the cleanest result",
        list: [
          "Film with the person clearly separated from the background",
          "Use steady, even light on the person",
          "Avoid fast movement and motion blur where you can",
        ],
        p: [],
      },
    ],
  },

  "video-upscaler": {
    howTo: "How to upscale a video to 1080p or 4K",
    steps: [
      "Drop a video of up to 3 minutes into the box above. Trim longer videos first.",
      "Choose 1080p (Full HD) or 4K.",
      "Start. The AI rebuilds detail frame by frame.",
      "Download the sharper video.",
    ],
    sections: [
      {
        h: "When it helps",
        list: [
          "Old home videos and low-resolution clips",
          "Videos saved small from messaging apps",
          "Footage you want to edit into a 1080p or 4K project",
        ],
        p: [
          "Upscaling adds sharpness and clean edges; it can't recover things that were never recorded, like a face far in the background of a tiny clip.",
        ],
      },
    ],
  },

  "photo-to-video": {
    howTo: "How to turn a photo into a video",
    steps: [
      "Drop one photo into the box above.",
      "Describe the motion if you like, for example “the camera slowly pushes in” or “waves roll in”.",
      "Choose 5 or 10 seconds, and whether to add natural sound.",
      "Confirm you have the rights to the photo, start, and download the 1080p MP4.",
    ],
    sections: [
      {
        h: "Made with Kling 3.0",
        p: [
          "Readily uses Kling 3.0 in its Pro mode, one of the top-rated image-to-video models, at 1080p. It keeps the people and the scene from your photo and adds natural movement: hair and clothes in the wind, water, clouds, gentle camera moves and subtle expressions.",
        ],
      },
      {
        h: "Writing the motion",
        list: [
          "Describe one main movement rather than many",
          "Say how the camera moves: slowly push in, pan left, stay still",
          "Keep it physically possible for the scene",
          "Leave it empty for a natural, gentle animation",
        ],
        p: [],
      },
      {
        h: "Responsible use",
        p: [
          "Use your own photos or photos you have the rights to. Don't make clips that show real people doing or saying things they didn't.",
        ],
      },
    ],
  },
};
