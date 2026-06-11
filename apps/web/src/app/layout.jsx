import "../index.css";

import PwaBoot from "../components/pwa/PwaBoot";

export const metadata = {
  title: "Storvex — Store control system",
  description:
    "Storvex helps store owners track sales, stock, cash, staff activity, and branch performance with real-time clarity.",
  applicationName: "Storvex",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Storvex",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/storvex_icon.webp", type: "image/webp" },
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06111F",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <PwaBoot />
        {children}
      </body>
    </html>
  );
}