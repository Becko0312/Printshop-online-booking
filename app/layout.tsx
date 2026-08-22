import type { Metadata } from "next";
import "./globals.css";
import { t } from "@/lib/i18n";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: `${t.brand} — Cloud Print SaaS`,
  description: t.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn">
      <body className="min-h-screen antialiased flex flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
