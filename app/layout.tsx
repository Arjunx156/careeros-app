import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerOS — AI-Powered Job Search Command Center",
  description:
    "Resume optimizer, application tracker, and networking assistant — all in one intelligent platform.",
  keywords: [
    "job search",
    "resume optimizer",
    "ATS checker",
    "application tracker",
    "career management",
  ],
  openGraph: {
    title: "CareerOS",
    description: "Your personal AI-powered job search command center",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
