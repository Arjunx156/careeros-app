import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CareerOS",
    template: "%s · CareerOS",
  },
  description:
    "Personal job search command center — resume optimizer, application tracker, and networking assistant.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#f9fafb",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body>
        <QueryProvider>{children}</QueryProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "!rounded-[var(--radius-control)] !border !border-line !bg-surface !text-ink !shadow-[var(--shadow-dropdown)]",
            },
          }}
        />
      </body>
    </html>
  );
}
