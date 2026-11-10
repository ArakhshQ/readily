import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Readily handles your files and data. Most tools run on your device and never upload your files; AI tools process files privately and delete them within 24 hours.",
  alternates: { canonical: "/privacy/" },
};

const PROCESSORS = [
  ["Render", "Hosts the website.", "United States"],
  ["Supabase", "Accounts, saved files, history, AI job records and temporary AI files.", "United States / your project's region"],
  ["Brevo", "Account emails such as sign-up confirmation and password resets.", "European Union"],
  ["Stripe", "Payments, invoices and subscriptions. Readily never receives your card number.", "United States / worldwide"],
  ["Anthropic (Claude)", "Text AI: summaries, questions about documents, translation and plain-words commands.", "United States"],
  ["ElevenLabs", "Voice AI: transcription, best-quality voice isolation, voiceover, voice changer and dubbing.", "United States / European Union"],
  ["Replicate", "GPU models: studio voice, photo upscaling, restoration, colorizing, photo editing, photo to video and video tools.", "United States"],
];

export default function Privacy() {
  return (
    <div className="wrap narrow prose">
      <h1>Privacy policy</h1>
      <p className="updated">Last updated November 9, 2026</p>
      <p>
        This policy explains what Readily (&ldquo;we&rdquo;) collects, why, and the choices you have. In short: most tools never upload your
        files; AI tools that need our servers only receive what they need, keep it for at most 24 hours, and never use it to train AI.
      </p>

      <h2>1. Tools that run on your device</h2>
      <p>
        The 20 everyday tools and the on-device Basic tools (voice noise remover, background remover, photo upscaler, object eraser, searchable
        scans, protect and unlock PDF, remove silences and PDF to Word) run entirely in your web browser. Your file is read and processed on your
        device and is never sent to us. To make these tools work, your browser downloads Readily&apos;s own code and AI models; some language
        data for text recognition is downloaded from the public tessdata mirror on jsDelivr. These downloads contain no information about your
        files.
      </p>

      <h2>2. AI tools that run on our servers</h2>
      <p>
        Some tools need powerful AI that can&apos;t run on a phone or laptop. Each of these tools is labelled on its page, and only works when
        you&apos;re signed in and press the button. When you use one:
      </p>
      <ul>
        <li>
          <strong>Only what&apos;s needed is sent.</strong> Document tools send the text of your document, read on your device, not the file.
          Voice and subtitle tools send only the sound, converted on your device. Photo and video tools send the photo or video.
        </li>
        <li>
          <strong>It&apos;s private.</strong> Files are stored in a private area only your account can reach, and passed to the AI provider over
          an encrypted connection.
        </li>
        <li>
          <strong>It&apos;s deleted.</strong> The file you send is deleted as soon as the job finishes. The result is kept for 24 hours so you can
          download it, then deleted. We keep a record of the job (which tool, when, credits used, and whether it worked) for your history and
          billing, but not the file or its contents.
        </li>
        <li>
          <strong>It isn&apos;t used for training.</strong> We don&apos;t train AI on your files, and our AI providers process them only to give
          you the result, under agreements that don&apos;t allow them to train on it.
        </li>
      </ul>

      <h2>3. Your account</h2>
      <p>
        Using Readily never requires an account. If you create one, we store your email address, your name if you give it, your plan, your
        credit balance, and a password protected by our sign-in provider. While you&apos;re signed in, your dashboard records which tool you used
        and the names and sizes of the results, never the files themselves. Free accounts keep this history for 30 days; paid plans keep it until
        you clear it.
      </p>
      <p>
        A file is only stored in your account when you press &ldquo;Save to my files&rdquo;. You can delete saved files, clear your history, or
        delete your whole account at any time from your dashboard. Deleting your account removes your saved files, history, AI job records and
        profile. We keep payment records that the law requires (such as invoices) in Stripe.
      </p>

      <h2>4. Payments</h2>
      <p>
        Payments are handled by Stripe. Your card details go straight to Stripe and never reach Readily. We receive your subscription status,
        plan, billing period and a customer reference so we can turn your plan on, and Stripe sends us notices when a payment succeeds, fails or a
        plan changes.
      </p>

      <h2>5. Who processes data for us</h2>
      <p>We use these service providers. Each only processes data to provide its part of Readily to you.</p>
      <div className="compare-scroll" style={{ marginBottom: 24 }}>
        <table className="compare" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th scope="col">Provider</th>
              <th scope="col">What for</th>
              <th scope="col">Where</th>
            </tr>
          </thead>
          <tbody>
            {PROCESSORS.map(([n, what, where]) => (
              <tr key={n}>
                <th scope="row">{n}</th>
                <td>{what}</td>
                <td>{where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>6. What the website itself receives</h2>
      <p>
        Like every website, the servers that deliver Readily see standard request information such as your IP address, browser type and the
        page you asked for. Our hosting provider may keep this in short-lived logs to keep the service running and secure.
      </p>
      <p>
        To see which tools people find useful, Readily counts visits with its own simple counter, not a third-party analytics service. It
        keeps only daily totals: how many browsers visited, which pages were opened, which tools finished a result, and the website that
        linked to us (for example &quot;google.com&quot;). No cookies, IP addresses or account details are stored with these counts, so they
        can&apos;t be traced back to you. If your browser sends &quot;Do Not Track&quot; or Global Privacy Control, you aren&apos;t counted at all.
      </p>

      <h2>7. Cookies and storage</h2>
      <p>
        Readily doesn&apos;t use advertising cookies or third-party trackers. If you sign in, your browser keeps a sign-in token so you stay
        signed in. We also remember a few small preferences on your device, such as when you last saw the sign-up reminder and the date of your last visit (so a visit is only counted once a day). Readily can save its
        own pages and code on your device so it opens quickly and works offline; this never includes your files.
      </p>

      <h2>8. Legal bases and your rights</h2>
      <p>
        We process account data to provide the service you asked for (contract), payment data to bill you and meet legal duties (contract and
        legal obligation), and security logs and visit totals to keep Readily safe and improve it (legitimate interest). Depending on where you live, you may have the right to
        access, correct, delete or export your data, and to object to or restrict processing. You can do most of this yourself from your
        dashboard; for anything else, contact us{SITE.contactEmail ? " at the address below" : ""}. You can also complain to your local data
        protection authority.
      </p>

      <h2>9. Children</h2>
      <p>Readily accounts are for people aged 16 and over. If you believe a child has created an account, contact us and we&apos;ll delete it.</p>

      <h2>10. Changes</h2>
      <p>
        If this policy changes, we&apos;ll update this page and the date at the top, and tell account holders by email about important changes.
        See also our <Link href="/terms/">terms</Link> and <Link href="/refunds/">refund policy</Link>.
      </p>

      {SITE.contactEmail && (
        <>
          <h2>Contact</h2>
          <p>
            Questions about privacy: <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
          </p>
        </>
      )}
    </div>
  );
}
