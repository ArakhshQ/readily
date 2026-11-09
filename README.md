# Readily

Free file tools that run entirely in the browser. Files are never uploaded.

**47 tools.** 20 free everyday tools (PDF, image, video, audio) that run in the browser, plus 27 paid tools:
9 on-device Basic tools (noise remover, background remover, upscaler, object eraser, searchable PDF, protect/unlock PDF, remove silences, PDF to Word) and 18 AI tools on Readily's server (summaries, Ask a PDF, transcription, subtitles, translation, studio voice, photo restore/colorize/upscale, voiceover, voice changer, dubbing, video background removal and upscaling, photo to video, AI photo editing, product backgrounds, and a plain-words assistant).

**Plans:** Free, Basic, Pro and Premium. Paid plans add higher-quality tools and AI paid for with monthly credits (waitlist until payments are connected).

**Launch:** see [docs/LAUNCH.md](docs/LAUNCH.md) for the AI keys, Stripe and domain.

**Accounts (optional):** sign up, log in, email verification, a dashboard with history and saved files, and plans. Powered by Supabase with emails sent through Brevo. Setup: [docs/ACCOUNTS-SETUP.md](docs/ACCOUNTS-SETUP.md).

## How it works

- Next.js 16 + TypeScript, exported as a fully static site (`out/`).
- PDF work uses [pdf-lib](https://pdf-lib.js.org) and [pdf.js](https://mozilla.github.io/pdf.js/); images are processed on a `<canvas>`; OCR uses tesseract.js; video and audio use ffmpeg.wasm.
- The heavy engines are copied from `node_modules` into `public/vendor` before every build (`scripts/copy-vendor.mjs`), so Readily serves them itself and no third-party CDN sees your users.
- Each tool has its own search-friendly page (`/jpg-to-pdf/`, `/merge-pdf/`, ...), generated from `src/lib/tools.ts`.
- Results can be handed straight to another tool without re-uploading (`src/lib/handoff.ts`).
- Installable as an app (web manifest + service worker in `public/`).

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # writes the static site to out/
```

## Deploy on Render

1. In Render, choose **New > Blueprint** and pick this repository. `render.yaml` sets up a free static site.
2. After you connect a domain, set `NEXT_PUBLIC_SITE_URL` to it (for example `https://readily.app`) and redeploy, so the sitemap and share links use the right address.
3. Optional: set `NEXT_PUBLIC_CONTACT_EMAIL` to show a contact address on the About, Privacy and Terms pages.
4. Optional: set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to turn on accounts (see docs/ACCOUNTS-SETUP.md).

## Project layout

```
src/app/            pages (home, tool pages, all tools, about, privacy, terms)
src/components/     UI, shared tool workspace, and one file per tool in tools/
src/lib/tools.ts    free tool catalog: names, SEO copy, FAQs, related tools
src/lib/tools-pro.ts paid tools: plan level, engine, credits
src/lib/plans.ts    plans, credits, allowances
supabase/schema.sql database, credits, security rules
supabase/functions/ AI server (ai), Stripe (billing, stripe-webhook), tests
src/lib/pdf-ops.ts  images to PDF, merge, split
src/lib/image-ops.ts compress to target size, resize, convert
public/             icons, manifest, service worker
scripts/            icon generator
```

## Adding a tool

1. Add an entry to `TOOLS` in `src/lib/tools.ts`.
2. Create its component in `src/components/tools/`.
3. Register it in `src/components/ToolRunner.tsx` and add its glyph in `src/components/Icons.tsx`.
4. Bump `VERSION` in `public/sw.js`.
5. Paid AI tool: also add it to `SERVER_TOOLS` in `supabase/functions/_shared/tools.ts` and a case in `supabase/functions/ai/index.ts`.
6. Run `python3 scripts/make-og.py` to make its share image.
