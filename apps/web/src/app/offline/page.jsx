import Link from "next/link";

export const metadata = {
  title: "Offline — Storvex",
};

export default function OfflinePage() {
  return (
    <main className="storvex-offline-page">
      <section className="storvex-offline-card">
        <div className="storvex-offline-logo">
          <img src="/storvex_icon.webp" alt="" />
        </div>

        <span>Connection unavailable</span>

        <h1>You are offline.</h1>

        <p>
          Storvex could not reach the internet. Check your connection, then return to your
          workspace.
        </p>

        <Link href="/" className="storvex-offline-action">
          Try again
        </Link>
      </section>
    </main>
  );
}