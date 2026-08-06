"use client";

import { BrowserRouter } from "react-router-dom";

import LandingPage from "../legacy-pages/public/LandingPage";
import { ThemeProvider } from "../theme/ThemeProvider";

export default function PublicLandingShell() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LandingPage />
      </ThemeProvider>
    </BrowserRouter>
  );
}
