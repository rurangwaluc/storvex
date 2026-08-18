import { notFound } from "next/navigation";

import LegacyClientApp from "../../../legacy-client-app";
import MarketplaceProductClient from "../../../../components/marketplace/MarketplaceProductClient";
import { isMarketplaceProductRoute } from "../../../../lib/knownLegacyRoutes";
import { getServerMarketplaceProduct } from "../../../../lib/marketplaceServerApi";

export default async function MarketplaceProductPage({ params }) {
  const { storeSlug, productSlug } = await params;
  const segments = ["marketplace", storeSlug, productSlug];

  if (!isMarketplaceProductRoute(segments)) {
    return <LegacyClientApp />;
  }

  const data = await getServerMarketplaceProduct(storeSlug, productSlug);

  if (data === null) {
    notFound();
  }

  return (
    <MarketplaceProductClient
      storeSlug={storeSlug}
      productSlug={productSlug}
      initialProductData={data}
    />
  );
}
