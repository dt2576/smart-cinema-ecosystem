import type { Metadata } from "next";
import { ProfileScreen } from "@/features/auth/profile-screen";

export const metadata: Metadata = {
  title: "My Profile | Smart Cinema",
  description: "View and update your Smart Cinema customer profile.",
};

export default function ProfilePage() {
  return <ProfileScreen />;
}
