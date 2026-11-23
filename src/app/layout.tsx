import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ServerWatch - Infrastructure & Container Monitoring",
  description: "Lightweight infrastructure and container monitoring dashboard",
  other: {
    "color-scheme": "light",
    "darkreader-lock": "true",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="darkreader-lock" content="true" />
      </head>
      <body
        className="min-h-full flex flex-col bg-page-bg text-text-primary"
        style={{ colorScheme: "light" }}
      >
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
