import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

// Fonts are self-hosted (latin subset, from @fontsource) instead of next/font/google
// so dev/build never depends on reaching fonts.googleapis.com.
const publicSans = localFont({
  src: "./fonts/public-sans-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-sans",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
});

// Matches the "ilovelawyer" wordmark styling in ilovelawyer-app (navbar.tsx,
// unified-auth.tsx, global-header.tsx) — fontFamily: "'Libre Caslon Text', serif".
// Unlike that app, actually load it via next/font here rather than relying on the
// serif fallback.
const libreCaslonText = localFont({
  src: "./fonts/libre-caslon-text-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-libre-caslon-text",
});

export const metadata: Metadata = {
  title: "Admin",
  description: "This is admin website for the iLovelawyer",
  icons: { icon: "/ilovelawyer-mark-dark.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistMono.variable, "font-sans", publicSans.variable, libreCaslonText.variable)}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
