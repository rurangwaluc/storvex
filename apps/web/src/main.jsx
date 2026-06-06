import "./index.css";

import App from "./App";
import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./theme/ThemeProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
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