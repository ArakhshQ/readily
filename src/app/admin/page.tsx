import type { Metadata } from "next";
import { AdminPage } from "@/components/admin/AdminPage";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function Admin() {
  return <AdminPage />;
}
