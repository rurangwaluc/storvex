"use client";

import dynamic from "next/dynamic";

const LegacyClientApp = dynamic(() => import("../legacy-client-app"), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-xl bg-cyan-400/30" />
        <p className="text-sm font-semibold tracking-wide text-white">
          Loading Storvex
        </p>
        <p className="mt-2 text-xs text-slate-300">
          Preparing your business workspace...
        </p>
      </div>
    </main>
  ),
});

export default function WebAppPage() {
  return <LegacyClientApp />;
}