import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingWelcome } from "@/components/BillingWelcome";

export const metadata: Metadata = {
  title: "Welcome to your plan",
  robots: { index: false },
  alternates: { canonical: "/billing/" },
};

export default function Billing() {
  return (
    <Suspense fallback={<div className="wrap billing-welcome" />}>
      <BillingWelcome />
    </Suspense>
  );
}
