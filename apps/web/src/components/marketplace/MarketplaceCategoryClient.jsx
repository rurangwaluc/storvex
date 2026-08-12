"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, StaticRouter } from "react-router-dom";

import MarketplaceCategory from "../../legacy-pages/marketplace/MarketplaceCategory";
import { createQueryClient } from "../../lib/queryClient";

export default function MarketplaceCategoryClient({
  slug,
  initialCatalogue,
  initialProducts,
  initialStores,
  initialRouteSearch = "",
  children,
}) {
  const [categoryQueryClient] = useState(createQueryClient);
  const category = (
    <MarketplaceCategory
      categorySlugOverride={slug}
      initialCatalogueData={initialCatalogue}
      initialProductData={initialProducts}
      initialStoresData={initialStores}
      serverIntro={children}
    />
  );

  return (
    <QueryClientProvider client={categoryQueryClient}>
      {typeof window === "undefined" ? (
        <StaticRouter location={`/marketplace/category/${slug}${initialRouteSearch ? `?${initialRouteSearch}` : ""}`}>
          {category}
        </StaticRouter>
      ) : (
        <BrowserRouter>{category}</BrowserRouter>
      )}
    </QueryClientProvider>
  );
}
