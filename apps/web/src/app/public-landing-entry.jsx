"use client";

import dynamic from "next/dynamic";

const PublicLandingShell = dynamic(
  () => import("./public-landing-shell"),
  {
    ssr: false,
    loading: () => (
      <main
        aria-label="Loading Storvex"
        style={{
          minHeight: "100dvh",
          background: "#ffffff",
        }}
      />
    ),
  },
);

export default function PublicLandingEntry() {
  return <PublicLandingShell />;
}
