import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  ImagePlus,
  Loader2,
  PackageCheck,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import {
  approveProductImageForListing,
  cleanProductImage,
  deleteProductImage,
  getProductById,
  getProductImages,
  getProductImageStudio,
  removeProductImageListingApproval,
  setPrimaryProductImage,
  uploadProductImage,
  useProductImageAsMain,
} from "../../services/inventoryApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./ProductImages.css";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  const result = String(value || "").trim();
  return result || "";
}

function formatRwf(value) {
  const amount = Number(value || 0);

  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0)}`;
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0);
}

function productPrice(product) {
  return Number(product?.sellPrice ?? product?.price ?? 0);
}

function productStock(product) {
  return Number(
    product?.effectiveStockQty ??
      product?.branchStockQty ??
      product?.stockQty ??
      0,
  );
}

function categoryLabel(product) {
  const brand = cleanString(product?.brand);
  const category = cleanString(product?.category);

  if (brand && category) {
    return `${brand} — ${category}`;
  }

  return brand || category || "Stock item";
}

function imageUrl(image) {
  return cleanString(
    image?.url ||
      image?.publicUrl ||
      image?.imageUrl,
  );
}

function imageType(image) {
  return cleanString(image?.imageType).toUpperCase() || "ORIGINAL";
}

function isCleanedImage(image) {
  return imageType(image) === "CLEANED";
}

function validateImageFile(file) {
  if (!file) return "Image file is required";

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Only JPG, PNG, and WEBP images are allowed";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Each product image must be 5MB or smaller";
  }

  return "";
}

function StatusBadge({ tone = "neutral", children }) {
  return (
    <span
      className={cx(
        "svx-product-images-badge",
        `is-${tone}`,
      )}
    >
      {children}
    </span>
  );
}

function InfoRow({ label, value, tone = "neutral" }) {
  return (
    <div
      className={cx(
        "svx-product-images-info-row",
        `is-${tone}`,
      )}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActionButton({
  children,
  icon: Icon,
  tone = "soft",
  loading = false,
  disabled = false,
  onClick,
}) {
  return (
    <button
      type="button"
      className={cx(
        "svx-product-images-studio-action",
        `is-${tone}`,
      )}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <Loader2
          size={15}
          className="svx-product-images-spin"
        />
      ) : Icon ? (
        <Icon size={15} strokeWidth={2.35} />
      ) : null}
      <span>{children}</span>
    </button>
  );
}

function FullImageViewer({
  image,
  productName,
  onClose,
  onSetPrimary,
  onDelete,
  busy,
}) {
  useEffect(() => {
    if (!image) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [image, onClose]);

  if (!image) return null;

  const url = imageUrl(image);
  const cleaned = isCleanedImage(image);
  const approved = Boolean(image?.isMarketplaceApproved);

  return (
    <div
      className="svx-product-images-viewer-layer"
      role="dialog"
      aria-modal="true"
      aria-label="Full product image"
    >
      <button
        type="button"
        className="svx-product-images-viewer-backdrop"
        onClick={onClose}
        aria-label="Close image preview"
      />

      <section className="svx-product-images-viewer">
        <header>
          <div>
            <div className="svx-product-images-viewer-badges">
              <StatusBadge
                tone={cleaned ? "blue" : "neutral"}
              >
                {cleaned ? "Cleaned image" : "Original image"}
              </StatusBadge>

              {approved ? (
                <StatusBadge tone="success">
                  Approved for listing
                </StatusBadge>
              ) : null}

              {image.isPrimary ? (
                <StatusBadge tone="success">
                  Main image
                </StatusBadge>
              ) : null}
            </div>

            <h2>{productName}</h2>
            <p>
              {image.altText ||
                (cleaned
                  ? "Cleaned product image preview"
                  : "Original product image preview")}
            </p>
          </div>

          <button
            type="button"
            className="svx-product-images-icon-button"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </header>

        <div className="svx-product-images-viewer-image">
          <img
            src={url}
            alt={image.altText || productName}
          />
        </div>

        <footer>
          <button
            type="button"
            className="svx-product-images-soft-button"
            onClick={() => onSetPrimary(image)}
            disabled={
              busy ||
              image.isPrimary ||
              (cleaned && !approved)
            }
          >
            <Star size={16} strokeWidth={2.35} />
            <span>
              {image.isPrimary
                ? "Already main"
                : cleaned && !approved
                  ? "Approve before using as main"
                  : "Use as main image"}
            </span>
          </button>

          <button
            type="button"
            className="svx-product-images-danger-button"
            onClick={() => onDelete(image)}
            disabled={busy}
          >
            <Trash2 size={16} strokeWidth={2.35} />
            <span>Delete image</span>
          </button>
        </footer>
      </section>
    </div>
  );
}

function StudioImage({
  image,
  productName,
  actionBusy,
  onPreview,
  onApprove,
  onRemoveApproval,
  onUseAsMain,
  onDelete,
}) {
  const approved = Boolean(image?.isMarketplaceApproved);
  const main = Boolean(image?.isPrimary);
  const busy = Boolean(actionBusy);

  return (
    <article
      className={cx(
        "svx-product-images-studio-result",
        approved && "is-approved",
        main && "is-main",
      )}
    >
      <button
        type="button"
        className="svx-product-images-studio-image"
        onClick={() => onPreview(image)}
      >
        <img
          src={imageUrl(image)}
          alt={image.altText || productName}
        />

        <span>
          <Eye size={14} strokeWidth={2.35} />
          Review
        </span>
      </button>

      <div className="svx-product-images-studio-result-body">
        <div className="svx-product-images-studio-result-head">
          <div>
            <p>Cleaned result</p>
            <strong>
              {approved
                ? "Ready for product listing"
                : "Review before approving"}
            </strong>
          </div>

          <div className="svx-product-images-studio-badges">
            {approved ? (
              <StatusBadge tone="success">
                Approved
              </StatusBadge>
            ) : (
              <StatusBadge tone="warning">
                Needs review
              </StatusBadge>
            )}

            {main ? (
              <StatusBadge tone="success">
                Main image
              </StatusBadge>
            ) : null}
          </div>
        </div>

        <div className="svx-product-images-studio-actions">
          <ActionButton
            icon={Eye}
            onClick={() => onPreview(image)}
            disabled={busy}
          >
            Review
          </ActionButton>

          {approved ? (
            <ActionButton
              icon={X}
              tone="warning"
              onClick={() => onRemoveApproval(image)}
              loading={actionBusy === `approval-${image.id}`}
              disabled={busy}
            >
              Remove approval
            </ActionButton>
          ) : (
            <ActionButton
              icon={CheckCircle2}
              tone="success"
              onClick={() => onApprove(image)}
              loading={actionBusy === `approval-${image.id}`}
              disabled={busy}
            >
              Approve for listing
            </ActionButton>
          )}

          <ActionButton
            icon={Star}
            tone="primary"
            onClick={() => onUseAsMain(image)}
            loading={actionBusy === `main-${image.id}`}
            disabled={busy || !approved || main}
          >
            {main ? "Main image" : "Use as main"}
          </ActionButton>

          <ActionButton
            icon={Trash2}
            tone="danger"
            onClick={() => onDelete(image)}
            loading={actionBusy === `delete-${image.id}`}
            disabled={busy}
          >
            Delete
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

function OriginalStudioGroup({
  original,
  cleanedImage,
  productName,
  actionBusy,
  onPreview,
  onClean,
  onApprove,
  onRemoveApproval,
  onUseAsMain,
  onDelete,
}) {
  const cleaning =
    actionBusy === `clean-${original.id}`;

  return (
    <article
      className={cx(
        "svx-product-images-studio-group",
        cleanedImage ? "has-result" : "is-awaiting",
      )}
    >
      <div className="svx-product-images-studio-original">
        <button
          type="button"
          className="svx-product-images-studio-image"
          onClick={() => onPreview(original)}
        >
          <img
            src={imageUrl(original)}
            alt={original.altText || productName}
          />

          <span>
            <Eye size={14} strokeWidth={2.35} />
            View original
          </span>
        </button>

        <div className="svx-product-images-studio-original-body">
          <div>
            <StatusBadge tone="neutral">
              Original photo
            </StatusBadge>

            {original.isPrimary ? (
              <StatusBadge tone="success">
                Main image
              </StatusBadge>
            ) : null}

            {cleanedImage ? (
              <StatusBadge tone="neutral">
                Result available
              </StatusBadge>
            ) : null}
          </div>

          <strong>
            {cleanedImage
              ? "Prepare a new cleaned version"
              : "Prepare this photo for the product listing"}
          </strong>

          <p>
            {cleanedImage
              ? "Cleaning again safely replaces the current result. The original photo remains unchanged."
              : "Create one cleaned result, review it, and approve it before customers can see it."}
          </p>

          <ActionButton
            icon={Sparkles}
            tone="primary"
            onClick={() => onClean(original)}
            loading={cleaning}
            disabled={Boolean(actionBusy)}
          >
            {cleanedImage ? "Clean again" : "Clean image"}
          </ActionButton>
        </div>
      </div>

      {cleanedImage ? (
        <div className="svx-product-images-studio-results">
          <StudioImage
            image={cleanedImage}
            productName={productName}
            actionBusy={actionBusy}
            onPreview={onPreview}
            onApprove={onApprove}
            onRemoveApproval={onRemoveApproval}
            onUseAsMain={onUseAsMain}
            onDelete={onDelete}
          />
        </div>
      ) : null}
    </article>
  );
}

export default function ProductImages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [studio, setStudio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studioLoading, setStudioLoading] = useState(true);
  const [studioError, setStudioError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [imageActionBusy, setImageActionBusy] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  const [dragging, setDragging] = useState(false);

  const loadImages = useCallback(async () => {
    const imageData = await getProductImages(id);
    const nextImages = Array.isArray(imageData?.images)
      ? imageData.images
      : [];

    setImages(nextImages);
    return nextImages;
  }, [id]);

  const loadStudio = useCallback(async () => {
    setStudioLoading(true);

    try {
      const result = await getProductImageStudio(id);
      const nextStudio = result?.studio || null;

      setStudio(nextStudio);
      setStudioError("");

      return nextStudio;
    } catch (error) {
      setStudioError(
        error?.message ||
          "Image preparation is temporarily unavailable",
      );

      return null;
    } finally {
      setStudioLoading(false);
    }
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [productData] = await Promise.all([
        getProductById(id),
        loadImages(),
      ]);

      setProduct(productData?.product || productData);
    } catch (error) {
      if (
        handleSubscriptionBlockedError(error, {
          toastId: "product-images-load-blocked",
        })
      ) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to load product images",
      );
    } finally {
      setLoading(false);
    }

    await loadStudio();
  }, [id, loadImages, loadStudio]);

  useEffect(() => {
    load();
  }, [load]);

  async function reloadImageWorkspace() {
    const [nextImages, nextStudio] = await Promise.all([
      loadImages(),
      loadStudio(),
    ]);

    if (previewImage?.id) {
      const combined = [
        ...(nextStudio?.images || []),
        ...nextImages,
      ];

      const nextPreview =
        combined.find(
          (image) => image.id === previewImage.id,
        ) || null;

      setPreviewImage(nextPreview);
    }

    return {
      images: nextImages,
      studio: nextStudio,
    };
  }

  async function uploadFiles(files) {
    const imageFiles = Array.from(files || []);

    if (!imageFiles.length || uploading) return;

    const invalid = imageFiles
      .map(validateImageFile)
      .find(Boolean);

    if (invalid) {
      toast.error(invalid);
      return;
    }

    setUploading(true);

    try {
      for (const [index, file] of imageFiles.entries()) {
        await uploadProductImage(id, file, {
          altText: product?.name || file.name,
          sortOrder: images.length + index,
          isPrimary:
            images.length === 0 && index === 0,
        });
      }

      await reloadImageWorkspace();

      toast.success(
        imageFiles.length === 1
          ? "Image uploaded"
          : "Images uploaded",
      );
    } catch (error) {
      if (
        handleSubscriptionBlockedError(error, {
          toastId: "product-images-upload-blocked",
        })
      ) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to upload product image",
      );
    } finally {
      setUploading(false);
      setDragging(false);
    }
  }

  function handleUploadFiles(event) {
    const files = Array.from(
      event.target.files || [],
    );

    event.target.value = "";
    uploadFiles(files);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!uploading) {
      setDragging(true);
    }
  }

  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();

    const currentTarget = event.currentTarget;
    const relatedTarget = event.relatedTarget;

    if (
      !currentTarget ||
      !relatedTarget ||
      !currentTarget.contains(relatedTarget)
    ) {
      setDragging(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    setDragging(false);

    if (uploading) return;

    uploadFiles(
      Array.from(
        event.dataTransfer?.files || [],
      ),
    );
  }

  async function handleSetPrimary(image) {
    if (!image?.id || imageActionBusy) return;

    const cleaned = isCleanedImage(image);

    if (
      cleaned &&
      !image.isMarketplaceApproved
    ) {
      toast.error(
        "Approve this cleaned image before using it as the main image",
      );
      return;
    }

    setImageActionBusy(`main-${image.id}`);

    try {
      if (cleaned) {
        await useProductImageAsMain(
          id,
          image.id,
        );
      } else {
        await setPrimaryProductImage(
          id,
          image.id,
        );
      }

      await reloadImageWorkspace();
      toast.success("Main product image updated");
    } catch (error) {
      if (
        handleSubscriptionBlockedError(error, {
          toastId: "product-images-primary-blocked",
        })
      ) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to update the main image",
      );
    } finally {
      setImageActionBusy("");
    }
  }

  async function handleDeleteImage(image) {
    if (!image?.id || imageActionBusy) return;

    const label = isCleanedImage(image)
      ? "cleaned image"
      : "original image";

    const confirmed = window.confirm(
      `Delete this ${label}?`,
    );

    if (!confirmed) return;

    setImageActionBusy(`delete-${image.id}`);

    try {
      await deleteProductImage(id, image.id);
      await reloadImageWorkspace();
      setPreviewImage(null);
      toast.success("Image deleted");
    } catch (error) {
      if (
        handleSubscriptionBlockedError(error, {
          toastId: "product-images-delete-blocked",
        })
      ) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to delete image",
      );
    } finally {
      setImageActionBusy("");
    }
  }

  async function handleCleanImage(image) {
    if (!image?.id || imageActionBusy) return;

    const currentResult =
      cleanedForOriginal(image.id);

    if (currentResult) {
      const confirmed = window.confirm(
        currentResult.isMarketplaceApproved ||
          currentResult.isPrimary
          ? "Clean this photo again? The current approved or main result will be replaced and the new result will need review and approval."
          : "Clean this photo again? The current cleaned result will be safely replaced.",
      );

      if (!confirmed) return;
    }

    setImageActionBusy(`clean-${image.id}`);

    try {
      await cleanProductImage(id, image.id);
      await reloadImageWorkspace();

      toast.success(
        currentResult
          ? "Cleaned result replaced and ready for review"
          : "Cleaned image is ready for review",
      );
    } catch (error) {
      if (
        handleSubscriptionBlockedError(error, {
          toastId: "product-images-clean-blocked",
        })
      ) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to clean product image",
      );
    } finally {
      setImageActionBusy("");
    }
  }

  async function handleApproveImage(image) {
    if (!image?.id || imageActionBusy) return;

    setImageActionBusy(`approval-${image.id}`);

    try {
      await approveProductImageForListing(
        id,
        image.id,
      );

      await reloadImageWorkspace();
      toast.success("Image approved for listing");
    } catch (error) {
      if (
        handleSubscriptionBlockedError(error, {
          toastId: "product-images-approve-blocked",
        })
      ) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to approve image",
      );
    } finally {
      setImageActionBusy("");
    }
  }

  async function handleRemoveApproval(image) {
    if (!image?.id || imageActionBusy) return;

    const confirmed = window.confirm(
      "Remove this image from the approved listing photos?",
    );

    if (!confirmed) return;

    setImageActionBusy(`approval-${image.id}`);

    try {
      await removeProductImageListingApproval(
        id,
        image.id,
      );

      await reloadImageWorkspace();
      toast.success("Listing approval removed");
    } catch (error) {
      if (
        handleSubscriptionBlockedError(error, {
          toastId:
            "product-images-remove-approval-blocked",
        })
      ) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to remove approval",
      );
    } finally {
      setImageActionBusy("");
    }
  }

  const stock = productStock(product);

  const studioImages = Array.isArray(studio?.images)
    ? studio.images
    : [];

  const sourceImages = studioImages.length
    ? studioImages
    : images;

  const originalImages = sourceImages.filter(
    (image) => !isCleanedImage(image),
  );

  const allCleanedImages = sourceImages.filter(
    isCleanedImage,
  );

  function cleanedImageTime(image) {
    const value =
      image?.updatedAt ||
      image?.createdAt ||
      "";

    const timestamp = new Date(value).getTime();

    return Number.isFinite(timestamp)
      ? timestamp
      : 0;
  }

  function cleanedForOriginal(originalId) {
    return (
      allCleanedImages
        .filter(
          (image) =>
            cleanString(image.sourceImageId) ===
            cleanString(originalId),
        )
        .sort((left, right) => {
          const versionDifference =
            Number(right?.studioVersion || 0) -
            Number(left?.studioVersion || 0);

          if (versionDifference) {
            return versionDifference;
          }

          return (
            cleanedImageTime(right) -
            cleanedImageTime(left)
          );
        })[0] || null
    );
  }

  const cleanedImages = originalImages
    .map((original) =>
      cleanedForOriginal(original.id),
    )
    .filter(Boolean);

  const libraryImages = [
    ...originalImages,
    ...cleanedImages,
  ].sort((left, right) => {
    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    const sortDifference =
      Number(left.sortOrder || 0) -
      Number(right.sortOrder || 0);

    if (sortDifference) return sortDifference;

    return (
      cleanedImageTime(left) -
      cleanedImageTime(right)
    );
  });

  const primaryImage =
    libraryImages.find(
      (image) => image.isPrimary,
    ) ||
    libraryImages[0] ||
    null;

  const approvedCount = cleanedImages.filter(
    (image) => image.isMarketplaceApproved,
  ).length;

  if (loading && !product) {
    return (
      <main className="svx-product-images-page">
        <div className="svx-product-images-shell">
          <div className="svx-product-images-skeleton is-hero" />

          <div className="svx-product-images-skeleton-grid">
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="svx-product-images-skeleton is-card" />
        </div>
      </main>
    );
  }

  return (
    <main className="svx-product-images-page">
      <div className="svx-product-images-shell">
        <header className="svx-product-images-hero">
          <div>
            <button
              type="button"
              className="svx-product-images-back"
              onClick={() =>
                navigate(`/app/inventory/${id}`)
              }
            >
              <ArrowLeft size={18} strokeWidth={2.4} />
              <span>Product details</span>
            </button>

            <p className="svx-product-images-kicker">
              Product images
            </p>

            <h1>Prepare product photos.</h1>

            <p className="svx-product-images-hero-text">
              Upload original photos, create cleaned copies,
              review the results, and approve only the images
              you want customers to see.
            </p>
          </div>

          <div className="svx-product-images-hero-card">
            <StatusBadge
              tone={approvedCount ? "success" : "warning"}
            >
              {approvedCount
                ? `${approvedCount} approved`
                : "No approved images"}
            </StatusBadge>

            <strong>
              {product?.name || "Product"}
            </strong>

            <span>{categoryLabel(product)}</span>
          </div>
        </header>

        <section className="svx-product-images-summary">
          <InfoRow
            label="Selling price"
            value={formatRwf(productPrice(product))}
            tone="blue"
          />

          <InfoRow
            label="Available stock"
            value={formatNumber(stock)}
            tone={stock > 0 ? "success" : "danger"}
          />

          <InfoRow
            label="Original photos"
            value={formatNumber(originalImages.length)}
            tone={
              originalImages.length
                ? "success"
                : "warning"
            }
          />

          <InfoRow
            label="Approved for listing"
            value={formatNumber(approvedCount)}
            tone={
              approvedCount
                ? "success"
                : "warning"
            }
          />
        </section>

        <section className="svx-product-images-card">
          <div className="svx-product-images-card-head">
            <div>
              <h2>Product image library</h2>
              <p>
                Upload original product photos. You can still
                preview, delete, or choose the main image here.
              </p>
            </div>

            <button
              type="button"
              className="svx-product-images-soft-button"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={uploading}
            >
              {uploading ? (
                <Loader2
                  size={16}
                  className="svx-product-images-spin"
                />
              ) : (
                <UploadCloud
                  size={16}
                  strokeWidth={2.35}
                />
              )}

              <span>
                {uploading
                  ? "Uploading..."
                  : "Upload images"}
              </span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={handleUploadFiles}
            />
          </div>

          {libraryImages.length ? (
            <>
              <button
                type="button"
                className={cx(
                  "svx-product-images-drop-strip",
                  dragging && "is-dragging",
                )}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                disabled={uploading}
              >
                <UploadCloud
                  size={17}
                  strokeWidth={2.35}
                />

                <span>
                  {uploading
                    ? "Uploading..."
                    : dragging
                      ? "Drop to upload images"
                      : "Drag more images here or click to add more"}
                </span>
              </button>

              <div className="svx-product-images-grid">
                {libraryImages.map((image) => {
                  const cleaned =
                    isCleanedImage(image);

                  return (
                    <article
                      key={image.id}
                      className={cx(
                        "svx-product-images-image-card",
                        image.isPrimary &&
                          "is-primary",
                        cleaned &&
                          "is-cleaned",
                      )}
                    >
                      <button
                        type="button"
                        className="svx-product-images-image-preview"
                        onClick={() =>
                          setPreviewImage(image)
                        }
                      >
                        <img
                          src={imageUrl(image)}
                          alt={
                            image.altText ||
                            product?.name ||
                            "Product image"
                          }
                        />

                        <span>
                          <Eye
                            size={15}
                            strokeWidth={2.3}
                          />
                          View full image
                        </span>
                      </button>

                      <footer>
                        <div className="svx-product-images-library-badges">
                          <StatusBadge
                            tone={
                              cleaned
                                ? "blue"
                                : "neutral"
                            }
                          >
                            {cleaned
                              ? "Cleaned"
                              : "Original"}
                          </StatusBadge>

                          {image.isMarketplaceApproved ? (
                            <StatusBadge tone="success">
                              Approved
                            </StatusBadge>
                          ) : null}

                          {image.isPrimary ? (
                            <StatusBadge tone="success">
                              Main
                            </StatusBadge>
                          ) : null}
                        </div>

                        <div className="svx-product-images-card-actions">
                          <button
                            type="button"
                            className="svx-product-images-card-action"
                            onClick={() =>
                              setPreviewImage(image)
                            }
                          >
                            <Eye
                              size={14}
                              strokeWidth={2.35}
                            />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            className="svx-product-images-card-action"
                            onClick={() =>
                              handleSetPrimary(image)
                            }
                            disabled={
                              Boolean(imageActionBusy) ||
                              image.isPrimary ||
                              (cleaned &&
                                !image.isMarketplaceApproved)
                            }
                          >
                            <Star
                              size={14}
                              strokeWidth={2.35}
                            />
                            <span>
                              {image.isPrimary
                                ? "Main"
                                : "Use as main"}
                            </span>
                          </button>

                          <button
                            type="button"
                            className="svx-product-images-card-action is-danger"
                            onClick={() =>
                              handleDeleteImage(image)
                            }
                            disabled={Boolean(
                              imageActionBusy,
                            )}
                          >
                            <Trash2
                              size={14}
                              strokeWidth={2.35}
                            />
                            <span>Delete</span>
                          </button>
                        </div>
                      </footer>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <button
              type="button"
              className={cx(
                "svx-product-images-upload-zone",
                dragging && "is-dragging",
              )}
              onClick={() =>
                fileInputRef.current?.click()
              }
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              disabled={uploading}
            >
              <span aria-hidden="true">
                <ImagePlus
                  size={28}
                  strokeWidth={2.25}
                />
              </span>

              <strong>
                {uploading
                  ? "Uploading images..."
                  : dragging
                    ? "Drop images here"
                    : "Drag images here or click to add images"}
              </strong>

              <small>
                JPG, PNG, or WEBP. Maximum 5MB per image.
              </small>
            </button>
          )}
        </section>

        <section className="svx-product-images-card svx-product-images-studio">
          <div className="svx-product-images-card-head">
            <div>
              <p className="svx-product-images-section-label">
                Prepare for listing
              </p>

              <h2>Clean and approve images</h2>

              <p>
                Each original keeps one current cleaned result.
                Cleaning again safely replaces it and starts a
                new review.
              </p>
            </div>

            <div className="svx-product-images-studio-counts">
              <StatusBadge
                tone={approvedCount ? "success" : "warning"}
              >
                {approvedCount} approved
              </StatusBadge>

              <StatusBadge tone="neutral">
                {cleanedImages.length} cleaned
              </StatusBadge>
            </div>
          </div>

          {studioLoading ? (
            <div className="svx-product-images-studio-loading">
              <Loader2
                size={20}
                className="svx-product-images-spin"
              />
              <span>Loading image preparation...</span>
            </div>
          ) : studioError ? (
            <div className="svx-product-images-studio-error">
              <strong>
                Image preparation is unavailable
              </strong>
              <p>{studioError}</p>

              <button
                type="button"
                className="svx-product-images-soft-button"
                onClick={loadStudio}
              >
                Try again
              </button>
            </div>
          ) : originalImages.length ? (
            <div className="svx-product-images-studio-list">
              {originalImages.map((original) => (
                <OriginalStudioGroup
                  key={original.id}
                  original={original}
                  cleanedImage={cleanedForOriginal(
                    original.id,
                  )}
                  productName={
                    product?.name || "Product"
                  }
                  actionBusy={imageActionBusy}
                  onPreview={setPreviewImage}
                  onClean={handleCleanImage}
                  onApprove={handleApproveImage}
                  onRemoveApproval={
                    handleRemoveApproval
                  }
                  onUseAsMain={handleSetPrimary}
                  onDelete={handleDeleteImage}
                />
              ))}
            </div>
          ) : (
            <div className="svx-product-images-studio-empty is-large">
              <ImagePlus size={22} strokeWidth={2.2} />

              <div>
                <strong>
                  Upload an original photo first
                </strong>
                <p>
                  Once an original image is added, you can
                  create and review a cleaned version here.
                </p>
              </div>
            </div>
          )}
        </section>

        <Link
          to={`/app/inventory/${id}`}
          className="svx-product-images-bottom-link"
        >
          <PackageCheck size={16} strokeWidth={2.35} />
          Back to product details
        </Link>
      </div>

      <FullImageViewer
        image={previewImage}
        productName={
          product?.name || "Product image"
        }
        onClose={() => setPreviewImage(null)}
        onSetPrimary={handleSetPrimary}
        onDelete={handleDeleteImage}
        busy={Boolean(imageActionBusy)}
      />
    </main>
  );
}
