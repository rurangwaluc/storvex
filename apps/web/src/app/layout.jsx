import "../index.css";

export const metadata = {
  title: "Storvex",
  description:
    "Business control platform for sales, stock, cash, staff, and reports.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}