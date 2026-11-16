import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy",
  description: "How to cancel a Readily Basic, Pro or Premium plan, what happens to your credits, and when you can get a refund for a subscription payment.",
  alternates: { canonical: "/refunds/" },
};

export default function Refunds() {
  return (
    <div className="wrap narrow prose">
      <h1>Refund and Cancellation Policy</h1>
      <p className="updated">Last updated November 16, 2026</p>

      <h2>Cancel any time</h2>
      <p>
        Open your <Link href="/dashboard/">dashboard</Link> and choose &ldquo;Manage billing&rdquo;, then &ldquo;Cancel plan&rdquo;. Your plan
        stays on until the end of the period you&apos;ve paid for, and you won&apos;t be charged again. The free tools keep working either way.
      </p>

      <h2>14-day refund on your first payment</h2>
      <p>
        If Readily isn&apos;t right for you, ask within 14 days of your first payment for a plan and we&apos;ll refund it in full, as long as
        you&apos;ve used fewer than half of that month&apos;s AI credits. This applies once per person.
      </p>

      <h2>Yearly plans</h2>
      <p>
        If you cancel a yearly plan within 14 days of paying, we&apos;ll refund it in full under the same conditions. After that, you keep the
        plan until the end of the year and it won&apos;t renew.
      </p>

      <h2>When something goes wrong</h2>
      <p>
        If an AI job fails, its credits are returned automatically. If you were charged by mistake, charged twice, or a tool you pay for didn&apos;t
        work and we couldn&apos;t fix it, contact us and we&apos;ll put it right, including with a refund.
      </p>

      <h2>Your legal rights</h2>
      <p>
        Some countries give you extra rights, such as a right to cancel a new subscription within 14 days. Nothing here takes those rights away.
      </p>

      <h2>How to ask</h2>
      <p>
        {SITE.contactEmail ? (
          <>
            Email <a href={`mailto:${SITE.contactEmail}?subject=Refund`}>{SITE.contactEmail}</a> from your account&apos;s email address
          </>
        ) : (
          "Reply to your payment receipt email"
        )}
        , and we&apos;ll answer within 2 working days. Plans are sold through Paddle, our reseller and merchant of record, so approved refunds
        are paid by Paddle back to the card or PayPal account you used, and usually arrive within 5 to 10 days. You can also contact Paddle
        directly through the link in your receipt email.
      </p>
    </div>
  );
}
