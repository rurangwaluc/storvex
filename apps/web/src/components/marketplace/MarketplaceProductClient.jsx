"use client";

import { useState } from "react";

import LegacyClientApp from "../../app/legacy-client-app";
import { marketplaceQueryKeys } from "../../lib/marketplaceQueryKeys";
import { createQueryClient } from "../../lib/queryClient";

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

  return <LegacyClientApp queryClientInstance={productQueryClient} />;
}
