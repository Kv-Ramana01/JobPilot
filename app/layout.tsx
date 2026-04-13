// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "JobPilot — Smart Job Search for Developers",
    template: "%s | JobPilot",
  },
  description:
    "Discover software jobs globally, optimize your resume with AI, and apply faster. Built for freshers and entry-level developers.",
  keywords: [
    "jobs",
    "software engineer jobs",
    "developer jobs",
    "internship",
    "fresher jobs",
    "remote jobs",
    "AI resume",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "JobPilot",
    title: "JobPilot — Smart Job Search for Developers",
    description: "Discover software jobs globally and apply smarter with AI.",
  },
  twitter: {
    card: "summary_large_image",
    title: "JobPilot",
    description: "Smart job search for developers",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
