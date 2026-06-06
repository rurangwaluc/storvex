import type { Metadata, Viewport } from "next";
import { Quicksand } from "next/font/google";
import Script from "next/script";

import "./globals.css";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Storvex Platform",
    template: "%s | Storvex Platform",
  },
  description: "Internal platform control room for Storvex.",
  icons: {
    icon: [{ url: "/storvex_icon.webp", type: "image/webp" }],
    shortcut: [{ url: "/storvex_icon.webp", type: "image/webp" }],
    apple: [{ url: "/storvex_icon.webp", type: "image/webp" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#ffffff",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#1c1c1d",
    },
  ],
};

const themeScript = `
(function () {
  try {
    var theme = window.localStorage.getItem("storvex.platform.theme");

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="platform-theme-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>

      <body className={quicksand.className}>{children}</body>
    </html>
  );
}