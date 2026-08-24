"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, StaticRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import MarketplaceProductDetails from "../../legacy-pages/marketplace/MarketplaceProductDetails";
import { marketplaceQueryKeys } from "../../lib/marketplaceQueryKeys";
import { createQueryClient } from "../../lib/queryClient";
import { ThemeProvider } from "../../theme/ThemeProvider";

export default function MarketplaceProductClient({
  storeSlug,
  productSlug,
  initialProductData,
}) {
  const [productQueryClient] = useState(() => {
    const client = createQueryClient();

    client.setQueryData(
      marketplaceQueryKeys.product({ storeSlug, productSlug }),
      initialProductData,
    );

    return client;
  });
  const location = `/marketplace/${encodeURIComponent(storeSlug)}/${encodeURIComponent(productSlug)}`;
  const productRoute = (
    <Routes>
      <Route
        path="/marketplace/:storeSlug/:productSlug"
        element={<MarketplaceProductDetails />}
      />
    </Routes>
  );

  return (
    <QueryClientProvider client={productQueryClient}>
      <ThemeProvider>
        {typeof window === "undefined" ? (
          <StaticRouter location={location}>{productRoute}</StaticRouter>
        ) : (
          <BrowserRouter>{productRoute}</BrowserRouter>
        )}
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
    </QueryClientProvider>
  );
}
