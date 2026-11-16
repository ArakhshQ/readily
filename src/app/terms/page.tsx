import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using Readily: free online file tools, accounts, paid plans and subscriptions, AI credits, AI tools and acceptable use.",
  alternates: { canonical: "/terms/" },
};

export default function Terms() {
  return (
    <div className="wrap narrow prose">
      <h1>Terms of Service</h1>
      <p className="updated">Last updated November 16, 2026</p>
      <p>
        These terms apply when you use Readily, its free tools, an account or a paid plan. By using Readily you agree to them. If you don&apos;t
        agree, please don&apos;t use the service.
      </p>

      <h2>1. The service</h2>
      <p>
        Readily offers tools for working with your own files. The everyday tools are free and don&apos;t need an account. Basic, Pro and Premium
        plans add more tools and monthly AI credits, as described on the <Link href="/pricing/">pricing page</Link>. We may improve, change or
        retire tools over time; if we remove something that&apos;s a main part of a paid plan, we&apos;ll tell you and you can cancel.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must be at least 16 to create an account. Keep your password safe; you&apos;re responsible for what happens in your account. One
        account per person: creating extra accounts to collect free tries or trial credits isn&apos;t allowed.
      </p>

      <h2>3. Paid plans and billing</h2>
      <ul>
        <li>
          Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle
          provides all customer service inquiries and handles returns. Paddle&apos;s buyer terms also apply to your purchase.
        </li>
        <li>Plans are billed in advance, monthly or yearly, and renew automatically until you cancel. You can pay by card or PayPal.</li>
        <li>Prices are shown in US dollars. Paddle adds sales tax or VAT where required.</li>
        <li>
          You can cancel at any time from your dashboard (&ldquo;Manage billing&rdquo;). You keep your plan until the end of the period you&apos;ve
          paid for, and it isn&apos;t renewed after that.
        </li>
        <li>
          If you change plan, Paddle charges or credits the difference for the rest of the period. When you upgrade, you get the extra AI
          credits for the rest of the month; when you downgrade, your credits are capped at the new plan&apos;s amount.
        </li>
        <li>
          If a renewal payment fails, Paddle tries again for a while and you keep your plan meanwhile; if it still can&apos;t be collected, your
          account moves to the Free plan.
        </li>
        <li>We&apos;ll tell you at least 30 days before any price change, and it applies from your next renewal.</li>
        <li>
          Refunds are covered by our <Link href="/refunds/">refund policy</Link>.
        </li>
      </ul>

      <h2>4. AI credits</h2>
      <p>
        AI tools that run on our servers use credits. Each tool shows its cost before you run it. Paid plans get a fresh monthly allowance;
        unused credits don&apos;t carry over to the next month and have no cash value. New accounts get a one-time set of trial credits. If an AI
        job fails, its credits are returned automatically. Some features have fair-use limits, shown on the pricing page.
      </p>

      <h2>5. Your files and results</h2>
      <p>
        You keep all rights to the files you use and the results you make. You give us only the permission needed to process them and show you
        the result. Tools that run on your device never send us your files. AI tools that run on our servers handle files as described in our{" "}
        <Link href="/privacy/">privacy policy</Link>. Keep your originals until you&apos;ve checked each result.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You must not use Readily to:</p>
      <ul>
        <li>process files you don&apos;t have the right to use, or break anyone&apos;s copyright, privacy or other rights;</li>
        <li>
          clone, imitate or re-voice a real person, or make images or videos of a real person, without their permission, or in a way that could
          mislead people about what they said or did;
        </li>
        <li>create fake documents, IDs, certificates, receipts or other records, or anything meant to deceive or defraud;</li>
        <li>create sexual content involving minors, or content that harasses, threatens or promotes violence or hatred;</li>
        <li>break the law, or try to get around plan limits, credits, security or other people&apos;s accounts.</li>
      </ul>
      <p>
        AI providers we use also have their own usage rules, which apply to content made with their models. We may stop a job, remove content or
        suspend an account that breaks these rules.
      </p>

      <h2>7. AI results</h2>
      <p>
        AI can make mistakes. Summaries, answers, translations and transcripts may be incomplete or wrong, so check anything important,
        especially legal, medical or financial content, before you rely on it. You&apos;re responsible for how you use what you make.
      </p>

      <h2>8. No guarantee</h2>
      <p>
        We work hard to make Readily reliable, but it&apos;s provided &ldquo;as is&rdquo;, without warranties of any kind, as far as the law
        allows. We can&apos;t promise that a result will be accepted by a particular website, form or organization, or that the service will
        always be available.
      </p>

      <h2>9. Limits of responsibility</h2>
      <p>
        As far as the law allows, Readily isn&apos;t liable for indirect or consequential losses, or for lost or damaged files. Our total
        responsibility for any claim is limited to what you paid us in the 12 months before it. Nothing in these terms limits rights you have
        under consumer law that can&apos;t be limited.
      </p>

      <h2>10. Ending</h2>
      <p>
        You can stop using Readily and delete your account at any time. We may suspend or close an account that breaks these terms; if we close a
        paid account without a good reason, we&apos;ll refund the unused part of your plan.
      </p>

      <h2>11. Changes</h2>
      <p>We may update these terms. For important changes we&apos;ll tell account holders by email before they take effect.</p>

      {(SITE.contactEmail || SITE.businessName) && (
        <>
          <h2>Contact</h2>
          {SITE.businessName && (
            <p>
              Readily is run by {SITE.businessName}
              {SITE.businessAddress.length ? `, ${SITE.businessAddress.join(", ")}` : ""}. See the <Link href="/impressum/">Impressum</Link>.
            </p>
          )}
          {SITE.contactEmail && (
            <p>
              <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
            </p>
          )}
        </>
      )}
    </div>
  );
}
