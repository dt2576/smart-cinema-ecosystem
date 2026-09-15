import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "@/app/globals.css";
import { AuthProvider } from "@/features/auth/auth-context";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Cinema | Movies, Showtimes & Cinemas",
  description: "Discover your next cinema experience. Explore movies, premium cinemas and offers at Smart Cinema.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${space.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col"><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
