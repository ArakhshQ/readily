import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Sign Up Free",
  description: "Create a free Readily account to keep a history of your files, save results and open them on any device.",
  alternates: { canonical: "/signup/" },
};

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
