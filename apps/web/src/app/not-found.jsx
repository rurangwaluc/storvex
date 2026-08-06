import Link from "next/link";

export const metadata = {
  title: "Page not found — Storvex",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <Link href="/">Return to Storvex</Link>
    </main>
  );
}
