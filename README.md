# Readily

Free file tools that run entirely in the browser. Files are never uploaded.

**Tools at launch:** Images to PDF, Merge PDF, Split PDF, Compress image (to a target size), Resize image, Convert image.

## How it works

- Next.js 16 + TypeScript, exported as a fully static site (`out/`).
- PDF work uses [pdf-lib](https://pdf-lib.js.org); images are processed on a `<canvas>`.
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

## Project layout

```
src/app/            pages (home, tool pages, all tools, about, privacy, terms)
src/components/     UI, shared tool workspace, and one file per tool in tools/
src/lib/tools.ts    tool catalog: names, SEO copy, FAQs, related tools
src/lib/pdf-ops.ts  images to PDF, merge, split
src/lib/image-ops.ts compress to target size, resize, convert
public/             icons, manifest, service worker
scripts/            icon generator
```

## Adding a tool

1. Add an entry to `TOOLS` in `src/lib/tools.ts`.
2. Create its component in `src/components/tools/`.
3. Register it in `src/components/ToolRunner.tsx` and add its glyph in `src/components/Icons.tsx`.
4. Add the page to `PAGES` in `public/sw.js` and bump `VERSION`.
