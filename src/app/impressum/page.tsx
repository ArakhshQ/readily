import type { Metadata } from "next";
import { SITE } from "@/lib/site";

// German law (§ 5 DDG) requires a legal notice naming the business behind a website.
// Filled from NEXT_PUBLIC_BUSINESS_NAME / NEXT_PUBLIC_BUSINESS_ADDRESS on Render.
export const metadata: Metadata = {
  title: "Impressum – Legal Notice",
  description: "Legal notice (Impressum) for Readily: the business behind the site and how to contact it.",
  alternates: { canonical: "/impressum/" },
  robots: { index: false, follow: true },
};

export default function Impressum() {
  const { businessName: name, businessAddress: address, contactEmail: email } = SITE;
  return (
    <div className="wrap narrow prose">
      <h1>Impressum</h1>
      <p className="updated">Legal notice</p>
      {name ? (
        <>
          <h2>Angaben gemäß § 5 DDG</h2>
          <p>
            {name}
            {address.map((line) => (
              <span key={line}>
                <br />
                {line}
              </span>
            ))}
          </p>
          <h2>Kontakt</h2>
          <p>{email ? <>E-Mail: <a href={`mailto:${email}`}>{email}</a></> : "Kontakt über die Website."}</p>
          <h2>Verantwortlich für den Inhalt</h2>
          <p>
            {name}
            {address.length ? `, ${address.join(", ")}` : ""}
          </p>
          <h2>Verbraucherstreitbeilegung</h2>
          <p>Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
          <h2>Payments</h2>
          <p>
            Paid plans are sold by our online reseller Paddle.com, the merchant of record for all orders, which handles payment, tax, invoices and
            refunds.
          </p>
        </>
      ) : (
        <p>{email ? <>For legal questions, email <a href={`mailto:${email}`}>{email}</a>.</> : "Our legal details will appear here shortly."}</p>
      )}
    </div>
  );
}
