import { notFound } from "next/navigation";

import LegacyClientApp from "../../../legacy-client-app";
import MarketplaceProductClient from "../../../../components/marketplace/MarketplaceProductClient";
import { isMarketplaceProductRoute } from "../../../../lib/knownLegacyRoutes";
import { getCachedServerMarketplaceProduct } from "../../../../lib/marketplaceServerApi";
import {
  marketplaceProductSeo,
  serializeMarketplaceJsonLd,
} from "../../../../lib/seo/marketplaceProductSeo";

async function productContext(params) {
  const { storeSlug, productSlug } = await params;
  const segments = ["marketplace", storeSlug, productSlug];

  if (!isMarketplaceProductRoute(segments)) {
    return { storeSlug, productSlug, reserved: true, data: null };
  }

  const data = await getCachedServerMarketplaceProduct(storeSlug, productSlug);
  return { storeSlug, productSlug, reserved: false, data };
}

export async function generateMetadata({ params }) {
  const { storeSlug, productSlug, reserved, data } = await productContext(params);

  if (reserved || data === null) {
    return { robots: { index: false, follow: true } };
  }

  const seo = marketplaceProductSeo(data, storeSlug, productSlug);
  const image = seo.leadImage
    ? [{
        url: seo.leadImage.url,
        ...(seo.leadImage.width ? { width: seo.leadImage.width } : {}),
        ...(seo.leadImage.height ? { height: seo.leadImage.height } : {}),
        alt: seo.leadImage.alt,
      }]
    : [];

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonical },
    robots: { index: false, follow: true },
    openGraph: {
      type: "website",
      url: seo.canonical,
      siteName: "Storvex Marketplace",
      title: seo.title,
      description: seo.description,
      ...(image.length ? { images: image } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      ...(image.length ? { images: image.map((item) => item.url) } : {}),
    },
  };
}

export default async function MarketplaceProductPage({ params }) {
  const { storeSlug, productSlug, reserved, data } = await productContext(params);

  if (reserved) {
    return <LegacyClientApp />;
  }

  if (data === null) {
    notFound();
  }

  const seo = marketplaceProductSeo(data, storeSlug, productSlug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketplaceJsonLd(seo.breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeMarketplaceJsonLd(seo.productJsonLd) }}
      />
      <MarketplaceProductClient
        storeSlug={storeSlug}
        productSlug={productSlug}
        initialProductData={data}
      />
    </>
  );
}
