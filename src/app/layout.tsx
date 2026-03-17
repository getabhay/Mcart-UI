// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "MCART",
  description: "MCART web",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 dark:bg-[#0B0F14] dark:text-gray-100">
        <Header />
        <main className="mx-auto max-w-6xl px-0 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}