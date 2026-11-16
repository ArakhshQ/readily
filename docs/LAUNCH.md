# Launch guide: AI tools and payments

The website, the 20 free tools and the on-device Basic tools work as soon as Render
deploys. The AI tools and payments need a few accounts and keys. Do these steps in
order; each one takes 5 to 15 minutes.

You'll run a few commands in a terminal on your computer, inside the `readily` folder
(`git clone https://github.com/ArakhshQ/readily && cd readily && npm install`).

---

## 1. Update the database

Supabase > **SQL Editor** > New query > paste all of `supabase/schema.sql` > **Run**.

It's safe to run again. It adds AI credits (every existing account gets its 20 trial
credits), the AI job log, free-try tracking, Paddle billing fields and two private storage
buckets for AI files.

## 2. Connect the Supabase command line

```bash
npx supabase login                     # opens the browser once
npx supabase link --project-ref YOUR_PROJECT_REF
```

Your project ref is the part before `.supabase.co` in your Project URL.

## 3. Create the AI accounts

| Service | What it powers | Where to get the key |
| --- | --- | --- |
| Anthropic | Summaries, Ask a PDF, translation, "Do it for me" | console.anthropic.com > API keys |
| ElevenLabs | Transcription, subtitles, best-quality voice, voiceover, voice changer, dubbing | elevenlabs.io > Developers > API keys |
| Replicate | Studio voice, HD upscaler, restore, colorize, photo editor, product backgrounds, photo to video, video tools | replicate.com > Account > API tokens |

In each one, **add a payment method and set a monthly spending limit** (for example
$50 to start). The credit system caps what each customer can use, and the spending
limit protects you from anything unexpected.

```bash
npx supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  ELEVENLABS_API_KEY=... \
  REPLICATE_API_TOKEN=r8_... \
  SITE_URL=https://readilytools.com \
  ALLOWED_ORIGINS=https://readilytools.com
```

## 4. Deploy the AI and payment server

```bash
npx supabase functions deploy ai
npx supabase functions deploy billing
npx supabase functions deploy paddle-webhook --no-verify-jwt
```

Check it: log in on the site with a free account, open **Summarize PDF**, and summarize
any PDF. It should take a few seconds and use 1 of your 20 trial credits.

## 5. Payments (Paddle)

Paid plans are sold through Paddle, Readily's reseller and merchant of record. Follow
**docs/PADDLE.md** step by step: business registration, Paddle account, Impressum details, keys,
the "Set up Paddle" workflow, and one real test purchase.

## 6. Contact email

Render > Environment: set `NEXT_PUBLIC_CONTACT_EMAIL` (for example
`hello@yourdomain.com`). It appears on the privacy, terms and refund pages, which
Paddle and app stores expect. Redeploy.

## 6b. Your admin page

1. Supabase > SQL Editor: run `supabase/schema.sql` again (it adds visit counting and
   the admin reports), then run this once with the email you sign in with:

   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'YOUR EMAIL';
   ```

2. Log in on the site, then open `/admin/`. Anyone else (or you, logged out) sees
   "This page doesn't exist". Opening it once also stops your own browsing from being
   counted in the visitor numbers on that browser.

Visit counting keeps only daily totals (no cookies, IPs or user IDs) and skips browsers
that send Do Not Track.

## 7. Domain and search

1. Buy a domain, then Render > your site > **Settings > Custom Domains** > add it and
   follow the DNS steps.
2. Render > Environment: `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`, redeploy.
3. Supabase > Authentication > URL Configuration: set Site URL to the new domain and
   add `https://yourdomain.com/**` to Redirect URLs.
4. Update the secrets: `npx supabase secrets set SITE_URL=https://yourdomain.com ALLOWED_ORIGINS=https://yourdomain.com`.
6. Brevo: verify the domain (SPF and DKIM) and send from `hello@yourdomain.com`.
7. Google Search Console: add the domain, then submit `https://yourdomain.com/sitemap.xml`.
   Do the same in Bing Webmaster Tools.

## 8. Before you announce it

- [ ] Run each AI tool once yourself with a real file. Replicate occasionally renames a
      model's inputs; if a tool fails, the error message names the problem, and models
      can be swapped with a `REPLICATE_MODEL_<TOOL>` secret.
- [ ] Spending limits set in Anthropic, ElevenLabs and Replicate.
- [ ] Ask a lawyer to review the privacy policy, terms and refund policy and add your
      business name and address.
- [ ] Paddle approved and set up (docs/PADDLE.md), `NEXT_PUBLIC_PAYMENTS_ENABLED=true`.
- [ ] Domain, Search Console and Brevo domain verified.

---

## How it fits together

- **Website** (Render, static): all pages and the on-device tools.
- **Supabase**: accounts, database, private storage, and three edge functions:
  - `ai`: checks the plan and free tries, measures the real file length, takes credits,
    runs the AI, stores the result privately for 24 hours, refunds credits on failure.
  - `billing`: prepares Paddle's checkout, switches plans, or opens Paddle's customer portal.
  - `paddle-webhook`: the only thing that changes a plan or adds monthly credits.
- **Prices** live in `src/lib/tools-pro.ts` (website) and
  `supabase/functions/_shared/tools.ts` (server). The build fails if they disagree.

Server tests: `cd supabase/functions && deno test --allow-env --allow-read _tests/`.
