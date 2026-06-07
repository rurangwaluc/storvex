"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Toaster } from "react-hot-toast";

import StorvexAppLoader from "../components/pwa/StorvexAppLoader";
import { ThemeProvider } from "../theme/ThemeProvider";

const App = dynamic(() => import("../App"), {
  ssr: false,
  loading: () => <StorvexAppLoader />,
});

export default function LegacyClientApp() {
  return (
    <React.StrictMode>
      <ThemeProvider>
        <App />

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
              color: "var(--color-text)",
              boxShadow: "var(--shadow-card)",
              fontFamily:
                "Quicksand, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              fontWeight: 700,
            },
          }}
        />
      </ThemeProvider>
    </React.StrictMode>
  );
}