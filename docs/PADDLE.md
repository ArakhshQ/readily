# Paddle setup (real payments)

Paddle is Readily's online reseller and **merchant of record**: customers pay Paddle (card or
PayPal), Paddle charges the right sales tax / VAT worldwide, sends invoices and handles refunds,
and pays the business out. Readily never sees card or PayPal details.

**Who does what**

- **Partner** (the business owner in Germany): steps 1 to 6. Only the partner logs in to Paddle.
- **Owner of the GitHub / Supabase / Render accounts**: steps 7 to 10.
- Secret keys are typed straight into GitHub. Never into a chat, email or messaging app.

---

## 1. Register the business (partner, about 1 hour, €20 to €60)

1. Search "Gewerbeanmeldung online" plus the city name, and register:
   - Rechtsform: **Einzelunternehmen** (choose *Nebengewerbe* if there's another main job).
   - Tätigkeit: *Betrieb einer Website mit Online-Software-Diensten (Datei- und KI-Tools) im Abonnement*.
2. Fill in the **Fragebogen zur steuerlichen Erfassung** on ELSTER and choose the
   **Kleinunternehmerregelung (§ 19 UStG)**. The tax office sends a Steuernummer.

Do this **before** the first sale.

## 2. Create the Paddle account (partner)

1. Go to **paddle.com**, choose **Get started**, and sign up with **exactly** the name and
   address used for the Gewerbe. Choose **individual / sole trader** if asked.
2. Turn on **two-factor login** (account menu, then Security).
3. Complete **verification**: identity (photo ID) and the payout bank account.
   Paddle also reviews the website (step 5).

## 3. Business details on the website (owner, 5 minutes)

German law requires an Impressum, and Paddle checks for it. In **Render > readily >
Environment**, add:

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_BUSINESS_NAME` | the partner's full name (as on the Gewerbe) |
| `NEXT_PUBLIC_BUSINESS_ADDRESS` | address lines separated by `;`, e.g. `Musterstr. 1; 10115 Berlin; Deutschland` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `support@readilytools.com` (already set) |

**Save, rebuild and deploy.** Check `readilytools.com/impressum/`. A paid business-address
service can be used instead of a home address.

## 4. Checkout settings in Paddle (partner)

1. **Checkout > Checkout settings**:
   - **Default payment link**: `https://readilytools.com/pricing/`
   - **Payment methods**: make sure **PayPal** is ticked (cards are on by default). Save.
2. **Paddle > Website approval** (or the verification checklist): add `readilytools.com`.

## 5. Website review (Paddle, usually a few days)

Paddle checks that readilytools.com shows the product, prices (`/pricing/`), terms (`/terms/`),
privacy policy (`/privacy/`), refund policy (`/refunds/`) and the business name (`/impressum/`).
All are live. Answer any questions Paddle emails.

## 6. Create the two keys (partner, after approval)

In Paddle: **Developer tools > Authentication**.

1. **Client-side token**: create one, name it "Readily website". It starts with `live_`.
   It's public by design, so it's fine to send to the owner.
2. **API key**: create one, name it "Readily server", expiry **1 year** (put a calendar reminder
   to renew it). Give it **only** these permissions:
   - `product.write`, `price.write`, `notification_setting.write` (setup)
   - `subscription.write`, `customer_portal_session.write` (plan changes and Manage billing)

   It starts with `pdl_live_`. **Secret: never send it in a chat.** Either type it into GitHub
   yourself (step 7) or share the screen with the owner while they do.

## 7. Save the API key in GitHub (owner or partner)

GitHub > the `readily` repository > **Settings > Secrets and variables > Actions > New
repository secret**:

- Name: `PADDLE_API_KEY`, Value: the `pdl_live_…` key.

(`SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` are already there from the AI server setup.)

## 8. Run "Set up Paddle" (owner, 2 minutes)

GitHub > **Actions > Set up Paddle > Run workflow**. It:

- creates **Readily Basic, Pro and Premium** in Paddle with monthly and yearly prices
  ($4.99 / $49, $11.99 / $119, $29.99 / $299),
- creates the webhook that tells Readily when someone pays, renews or cancels,
- saves the keys on the AI server (Supabase), without printing them.

It's safe to run again. Then run **Actions > Deploy AI server > Run workflow** once.

## 9. Switch on payments on the website (owner)

**Render > readily > Environment**:

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | the `live_…` client-side token |
| `NEXT_PUBLIC_PAYMENTS_ENABLED` | `true` |

**Save, rebuild and deploy.** The waitlist buttons become **Get Basic / Pro / Premium**.

## 10. Do one real purchase, then refund it

1. Log in to Readily with a normal account and buy **Basic monthly** ($4.99) with a real card or
   PayPal.
2. You should land on "Welcome to Basic" within seconds, and the dashboard should show 200 credits.
3. Dashboard > **Manage billing** opens Paddle's page: check that cancelling works.
4. Partner: in Paddle, **Transactions**, open the payment and **refund** it. Readily switches
   back to Free when the subscription ends.
5. Admin page: the user now shows as paid while active. Email the waitlist (Download CSV).

---

## How it works (for reference)

- **Checkout**: the site asks the `billing` server function for the price of the chosen plan, then
  opens Paddle's checkout window. The browser can't pick its own price: the plan is decided from the
  price Paddle reports.
- **Webhook** (`paddle-webhook`): Paddle signs every notification; the server checks the signature
  with `PADDLE_WEBHOOK_SECRET`, applies each notification once, ignores out-of-order ones, and is
  the only place a plan or its credits change.
- **Renewals** refill the monthly credits. **Failed renewal**: Paddle retries and the plan stays on
  meanwhile; if it can't collect, the subscription is canceled and the account becomes Free.
- **Plan switches** (from the pricing page) are charged or credited pro rata by Paddle; upgrading
  adds the extra credits for the rest of the month only.
- Secrets live in GitHub (to run setup) and Supabase (for the server). The website only has the
  public client-side token.
