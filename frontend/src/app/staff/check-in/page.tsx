import type { Metadata } from "next";
import { StaffCheckInWorkspace } from "@/features/staff/staff-checkin-workspace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Soát vé tại rạp | Smart Cinema", referrer: "no-referrer", robots: { index: false, follow: false } };
export default function StaffCheckInPage() { return <StaffCheckInWorkspace />; }
