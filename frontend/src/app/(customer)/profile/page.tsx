import type { Metadata } from "next";
import { ProfileScreen } from "@/features/auth/profile-screen";

export const metadata: Metadata = {
  title: "Hồ sơ của tôi | Smart Cinema",
  description: "Xem và cập nhật hồ sơ khách hàng Smart Cinema.",
};

export default function ProfilePage() {
  return <ProfileScreen />;
}
