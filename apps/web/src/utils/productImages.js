function cleanString(value) {
  return String(value || "").trim();
}

export function getProductImageUrl(image) {
  if (typeof image === "string") {
    return cleanString(image);
  }

  return cleanString(
    image?.url ||
      image?.publicUrl ||
      image?.imageUrl,
  );
}

export function isApprovedProductImage(image) {
  if (!image || typeof image === "string") {
    return false;
  }

  return (
    image.isMarketplaceApproved === true &&
    cleanString(image.imageType).toUpperCase() ===
      "CLEANED" &&
    Boolean(getProductImageUrl(image))
  );
}

export function getApprovedProductImages(product) {
  const images = Array.isArray(product?.images)
    ? product.images
    : [];

  return images
    .filter(isApprovedProductImage)
    .sort(
      (left, right) =>
        Number(Boolean(right?.isPrimary)) -
        Number(Boolean(left?.isPrimary)),
    );
}

export function getApprovedProductImage(product) {
  return getApprovedProductImages(product)[0] || null;
}

export function getApprovedProductImageUrl(product) {
  return getProductImageUrl(
    getApprovedProductImage(product),
  );
}
