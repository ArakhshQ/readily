# Turning on accounts (Supabase + Brevo)

Readily works without this. These steps switch on sign up, log in, email
verification, the dashboard, saved files and the sign-up reminder.
About 20 minutes, done once.

## 1. Create the Supabase project

1. Go to https://supabase.com, sign up, and click **New project**.
2. Name it `readily`, set a strong database password (save it in a password manager),
   and pick the region closest to most of your users.
3. When it's ready, open **SQL Editor > New query**, paste the whole of
   `supabase/schema.sql` from this repo, and click **Run**. It should say "Success".

## 2. Point Supabase at your site

**Authentication > URL Configuration**

- **Site URL:** `https://readily-3zay.onrender.com` (later: your real domain)
- **Redirect URLs:** add
  - `https://readily-3zay.onrender.com/**`
  - `http://localhost:3000/**` (for local testing)

**Authentication > Sign In / Providers > Email**

- Keep **Confirm email** turned on.
- Set **Minimum password length** to 8.

## 3. Send emails through Brevo

1. In Brevo (https://www.brevo.com): **Senders, Domains & Dedicated IPs > Senders**,
   add and verify the address emails should come from (for example `hello@yourdomain`).
   Verifying your domain (SPF/DKIM) keeps mail out of spam; do it once you own the domain.
2. **SMTP & API > SMTP** tab: note the **SMTP server**, **port**, **login**, and create an
   **SMTP key** (this is the password).
3. In Supabase: **Authentication > Emails > SMTP Settings**, turn on **Custom SMTP**:
   - Sender email: the verified Brevo sender
   - Sender name: `Readily`
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - Username: your Brevo SMTP login
   - Password: the Brevo SMTP key
4. Supabase limits emails per hour by default; under **Authentication > Rate Limits**
   raise "emails sent per hour" (for example to 100) once custom SMTP is on.

## 4. Branded email templates

**Authentication > Emails > Templates.** For each template, paste the subject from
`supabase/email-templates/SUBJECTS.md` and the matching HTML file:

| Supabase template | File |
| --- | --- |
| Confirm signup | `confirm-signup.html` |
| Reset password | `reset-password.html` |
| Change email address | `change-email.html` |
| Magic link | `magic-link.html` |

## 5. Connect Render

Supabase: **Project Settings > API** (or **API Keys**). Copy the **Project URL** and the
**anon / publishable** key. Never use the `service_role` / secret key in the website.

Render: your static site > **Environment** > add

- `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon / publishable key

Then **Manual Deploy > Deploy latest commit**. The anon key is designed to be public;
the database rules in `schema.sql` are what keep each user's data private.

## 6. Check it works

1. Open the site, click **Sign up free**, create an account with your own email.
2. The confirmation email should arrive from your Brevo sender. Click it: you land on
   your dashboard.
3. Use any tool, then press **Save to my files** on the result. It appears in the
   dashboard, and the tool shows up under History.
4. Log out, use **Forgot your password?**, and confirm the reset email works.

## Plans and payments

Four plans: Free, Basic ($4.99), Pro ($11.99) and Premium ($29.99). Tools, credits and
limits live in `src/lib/plans.ts`; the storage allowances in `plan_storage_bytes()` in
`schema.sql`; keep them in sync.

**After changing plans, run the whole `schema.sql` again** in the SQL editor. It's safe to
re-run: it updates the allowed plan names and moves anyone from the old "AI Plus" plan
to Pro.

Paid plans currently collect a waitlist (`profiles.plan_interest`). To see who's waiting,
run in the SQL editor:

```sql
select u.email, p.plan_interest, p.created_at
from public.profiles p join auth.users u on u.id = p.id
where p.plan_interest is not null
order by p.created_at;
```

When payments are connected, a server webhook (never the browser) sets `profiles.plan`.
