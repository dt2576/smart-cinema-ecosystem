import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StaffActivationForm } from "@/features/staff/staff-activation-form";
import { STAFF_ACTIVATION_PATH } from "@/features/staff/staff-activation-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Thiết lập mật khẩu nhân viên | Smart Cinema",
  description: "Thiết lập mật khẩu riêng qua lời mời nhân viên Smart Cinema.",
  referrer: "no-referrer", robots: { index: false, follow: false },
};

export default async function StaffActivationPage({ searchParams }: PageProps<"/staff/activate">) {
  // Reject query-based credentials/redirects before rendering the activation
  // UI, so Next's query-bearing route tree cannot survive in browser history.
  if (Object.keys(await searchParams).length) redirect(STAFF_ACTIVATION_PATH);
  return <StaffActivationForm />;
}
