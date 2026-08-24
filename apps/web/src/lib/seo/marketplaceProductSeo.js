const BASE_URL = "https://www.storvex.rw";
const MARKETPLACE_URL = `${BASE_URL}/marketplace`;
const TOP_LEVEL_CATEGORY_SLUGS = new Set([
  "electronics",
  "hardware",
  "home-and-kitchen",
  "lighting",
  "spare-parts",
]);

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function positiveDimension(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function publicImage(image, fallbackAlt = "") {
  const url = cleanText(typeof image === "string" ? image : image?.url || image?.thumbnailUrl);

  if (!/^https?:\/\//i.test(url)) return null;

  return {
    url,
    alt: cleanText(image?.altText) || cleanText(fallbackAlt),
    width: positiveDimension(image?.width),
    height: positiveDimension(image?.height),
  };
}

export function marketplaceProductCanonical(storeSlug, productSlug) {
  return `${MARKETPLACE_URL}/${encodeURIComponent(cleanText(storeSlug))}/${encodeURIComponent(cleanText(productSlug))}`;
}

export function marketplaceProductDescription(product, store, maximumLength = 160) {
  const fallback = `${cleanText(product?.title)} is available from ${cleanText(store?.name)} on Storvex Marketplace.`;
  const source = cleanText(product?.description) || fallback;

  if (source.length <= maximumLength) return source;

  const shortened = source.slice(0, Math.max(1, maximumLength - 1));
  const lastSpace = shortened.lastIndexOf(" ");
  const boundary = lastSpace >= Math.floor(maximumLength * 0.65) ? lastSpace : shortened.length;
  return `${shortened.slice(0, boundary).replace(/[.,;:!?\s]+$/, "")}…`;
}

export function marketplaceProductLeadImage(product) {
  const images = Array.isArray(product?.images) ? product.images : [];
  const primary = images.find((image) => image?.isPrimary);
  return publicImage(primary || product?.image || images[0], product?.title);
}

export function marketplaceProductBreadcrumbs({ product, store, canonical }) {
  const items = [{ name: "Marketplace", url: MARKETPLACE_URL }];
  const taxonomy = Array.isArray(product?.categoryBreadcrumbs)
    ? product.categoryBreadcrumbs.filter((item) => cleanText(item?.label))
    : [];

  if (taxonomy.length) {
    for (const item of taxonomy) {
      const slug = cleanText(item.slug);
      items.push({
        name: cleanText(item.label),
        ...(TOP_LEVEL_CATEGORY_SLUGS.has(slug)
          ? { url: `${MARKETPLACE_URL}/category/${encodeURIComponent(slug)}` }
          : {}),
      });
    }
  } else {
    items.push({
      name: cleanText(store?.name),
      url: `${MARKETPLACE_URL}/stores/${encodeURIComponent(cleanText(store?.slug))}`,
    });
  }

  items.push({ name: cleanText(product?.title), url: canonical });
  return items.filter((item) => item.name);
}

export function marketplaceProductBreadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

function productOffer({ product, store, canonical }) {
  const price = Number(product?.price);
  const currency = cleanText(product?.currency).toUpperCase();
  const unavailable =
    product?.availability === "unavailable" ||
    store?.temporarilyClosed ||
    product?.seller?.temporarilyClosed;

  if (!Number.isFinite(price) || price <= 0 || !/^[A-Z]{3}$/.test(currency) || unavailable) {
    return null;
  }

  const availability = product?.availability === "out_of_stock"
    ? "https://schema.org/OutOfStock"
    : "https://schema.org/InStock";

  return {
    "@type": "Offer",
    url: canonical,
    price,
    priceCurrency: currency,
    availability,
    seller: {
      "@type": "Organization",
      name: cleanText(store?.name),
      url: `${MARKETPLACE_URL}/stores/${encodeURIComponent(cleanText(store?.slug))}`,
    },
  };
}

export function marketplaceProductJsonLd({ product, store, canonical, description }) {
  const leadImage = marketplaceProductLeadImage(product);
  const imageUrls = [
    leadImage?.url,
    ...(Array.isArray(product?.images)
      ? product.images.map((image) => publicImage(image, product?.title)?.url)
      : []),
  ].filter((url, index, values) => url && values.indexOf(url) === index);
  const attributes = product?.attributes && typeof product.attributes === "object"
    ? product.attributes
    : {};
  const offer = productOffer({ product, store, canonical });
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: cleanText(product?.title),
    description,
    ...(imageUrls.length ? { image: imageUrls } : {}),
    url: canonical,
  };

  for (const field of ["model", "color", "material", "size"]) {
    const value = cleanText(attributes[field]);
    if (value) data[field] = value;
  }

  const brand = cleanText(attributes.brand);
  if (brand) data.brand = { "@type": "Brand", name: brand };
  if (offer) data.offers = offer;

  return data;
}

export function marketplaceProductSeo(data, storeSlug, productSlug) {
  const { product, store } = data;
  const canonical = marketplaceProductCanonical(storeSlug, productSlug);
  const description = marketplaceProductDescription(product, store);
  const title = `${cleanText(product.title)} from ${cleanText(store.name)} | Storvex Marketplace`;
  const leadImage = marketplaceProductLeadImage(product);
  const breadcrumbs = marketplaceProductBreadcrumbs({ product, store, canonical });

  return {
    title,
    description,
    canonical,
    leadImage,
    breadcrumbs,
    breadcrumbJsonLd: marketplaceProductBreadcrumbJsonLd(breadcrumbs),
    productJsonLd: marketplaceProductJsonLd({ product, store, canonical, description }),
  };
}

export function serializeMarketplaceJsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
