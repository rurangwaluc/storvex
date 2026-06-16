import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Eye,
  ImagePlus,
  Loader2,
  PackageCheck,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import {
  uploadProductImage,
  deleteProductImage,
  getProductById,
  getProductImages,
  setPrimaryProductImage,
} from "../../services/inventoryApi";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./ProductImages.css";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  const s = String(value || "").trim();
  return s || "";
}

function formatRwf(value) {
  const n = Number(value || 0);

  return `Rwf ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0)}`;
}

function formatNumber(value) {
  const n = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function productPrice(product) {
  return Number(product?.sellPrice ?? product?.price ?? 0);
}

function productStock(product) {
  return Number(product?.effectiveStockQty ?? product?.branchStockQty ?? product?.stockQty ?? 0);
}

function categoryLabel(product) {
  return [cleanString(product?.brand), cleanString(product?.category)]
    .filter(Boolean)
    .join(" • ") || "Stock item";
}

function imageUrl(image) {
  return cleanString(image?.url || image?.publicUrl || image?.imageUrl);
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
  return <span className={cx("svx-product-images-badge", `is-${tone}`)}>{children}</span>;
}

function InfoRow({ label, value, tone = "neutral" }) {
  return (
    <div className={cx("svx-product-images-info-row", `is-${tone}`)}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FullImageViewer({ image, productName, onClose, onSetPrimary, onDelete, busy }) {
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

  return (
    <div className="svx-product-images-viewer-layer" role="dialog" aria-modal="true" aria-label="Full product image">
      <button type="button" className="svx-product-images-viewer-backdrop" onClick={onClose} aria-label="Close image preview" />

      <section className="svx-product-images-viewer">
        <header>
          <div>
            <StatusBadge tone={image.isPrimary ? "success" : "neutral"}>
              {image.isPrimary ? "Feature image" : "Product image"}
            </StatusBadge>
            <h2>{productName}</h2>
            <p>{image.altText || "Product image preview"}</p>
          </div>

          <button type="button" className="svx-product-images-icon-button" onClick={onClose} aria-label="Close preview">
            <X size={18} strokeWidth={2.5} />
          </button>
        </header>

        <div className="svx-product-images-viewer-image">
          <img src={url} alt={image.altText || productName} />
        </div>

        <footer>
          <button
            type="button"
            className="svx-product-images-soft-button"
            onClick={() => onSetPrimary(image)}
            disabled={busy || image.isPrimary}
          >
            <Star size={16} strokeWidth={2.35} />
            <span>{image.isPrimary ? "Already feature" : "Make feature image"}</span>
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

export default function ProductImages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageActionBusy, setImageActionBusy] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [dragging, setDragging] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const [productData, imageData] = await Promise.all([
        getProductById(id),
        getProductImages(id),
      ]);

      setProduct(productData?.product || productData);
      setImages(Array.isArray(imageData?.images) ? imageData.images : []);
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "product-images-load-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to load product images");
    } finally {
      setLoading(false);
    }
  }

  async function reloadImages() {
    const imageData = await getProductImages(id);
    const nextImages = Array.isArray(imageData?.images) ? imageData.images : [];
    setImages(nextImages);
    return nextImages;
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function uploadFiles(files) {
    const imageFiles = Array.from(files || []);

    if (!imageFiles.length || uploading) return;

    const invalid = imageFiles.map(validateImageFile).find(Boolean);
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
          isPrimary: images.length === 0 && index === 0,
        });
      }

      await reloadImages();
      toast.success(imageFiles.length === 1 ? "Image uploaded" : "Images uploaded");
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "product-images-upload-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to upload product image");
    } finally {
      setUploading(false);
      setDragging(false);
    }
  }

  function handleUploadFiles(event) {
    const files = Array.from(event.target.files || []);
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

    if (!currentTarget || !relatedTarget || !currentTarget.contains(relatedTarget)) {
      setDragging(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();

    setDragging(false);

    if (uploading) return;

    const files = Array.from(event.dataTransfer?.files || []);
    uploadFiles(files);
  }

  async function handleSetPrimary(image) {
    if (!image?.id || imageActionBusy) return;

    setImageActionBusy(true);

    try {
      await setPrimaryProductImage(id, image.id);
      const nextImages = await reloadImages();
      const nextPreview = nextImages.find((item) => item.id === image.id) || null;
      setPreviewImage(nextPreview);
      toast.success("Primary image updated");
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "product-images-primary-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to set primary image");
    } finally {
      setImageActionBusy(false);
    }
  }

  async function handleDeleteImage(image) {
    if (!image?.id || imageActionBusy) return;

    const confirmed = window.confirm("Delete this product image?");
    if (!confirmed) return;

    setImageActionBusy(true);

    try {
      await deleteProductImage(id, image.id);
      await reloadImages();
      setPreviewImage(null);
      toast.success("Image deleted");
    } catch (error) {
      if (handleSubscriptionBlockedError(error, { toastId: "product-images-delete-blocked" })) {
        return;
      }

      toast.error(error?.message || "Failed to delete image");
    } finally {
      setImageActionBusy(false);
    }
  }

  const stock = productStock(product);
  const primaryImage = images.find((image) => image.isPrimary) || images[0] || null;

  if (loading && !product) {
    return (
      <main className="svx-product-images-page">
        <div className="svx-product-images-shell">
          <div className="svx-product-images-skeleton is-hero" />
          <div className="svx-product-images-skeleton-grid">
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
            <button type="button" className="svx-product-images-back" onClick={() => navigate(`/app/inventory/${id}`)}>
              <ArrowLeft size={18} strokeWidth={2.4} />
              <span>Product details</span>
            </button>

            <p className="svx-product-images-kicker">Product images</p>
            <h1>Add product photos.</h1>
            <p className="svx-product-images-hero-text">
              Add as many product photos as you need. Choose one feature image to represent this product in lists and future sales channels.
            </p>
          </div>

          <div className="svx-product-images-hero-card">
            <StatusBadge tone={images.length ? "success" : "warning"}>
              {images.length ? "Images added" : "No images"}
            </StatusBadge>
            <strong>{product?.name || "Product"}</strong>
            <span>{categoryLabel(product)}</span>
          </div>
        </header>

        <section className="svx-product-images-summary">
          <InfoRow label="Selling price" value={formatRwf(productPrice(product))} tone="blue" />
          <InfoRow label="Available stock" value={formatNumber(stock)} tone={stock > 0 ? "success" : "danger"} />
          <InfoRow label="Images" value={formatNumber(images.length)} tone={images.length ? "success" : "warning"} />
          <InfoRow label="Feature image" value={primaryImage ? "Selected" : "Missing"} tone={primaryImage ? "success" : "warning"} />
        </section>

        <section className="svx-product-images-card">
          <div className="svx-product-images-card-head">
            <div>
              <h2>Product image library</h2>
              <p>Upload any number of product photos. Click a photo to view full size or choose it as the feature image.</p>
            </div>

            <button
              type="button"
              className="svx-product-images-soft-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 size={16} className="svx-product-images-spin" /> : <UploadCloud size={16} strokeWidth={2.35} />}
              <span>{uploading ? "Uploading..." : "Upload images"}</span>
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

          {images.length ? (
            <>
              <button
                type="button"
                className={cx("svx-product-images-drop-strip", dragging && "is-dragging")}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                disabled={uploading}
              >
                <UploadCloud size={17} strokeWidth={2.35} />
                <span>{uploading ? "Uploading..." : dragging ? "Drop to upload images" : "Drag more images here or click to add more"}</span>
              </button>

              <div className="svx-product-images-grid">
              {images.map((image) => {
                const url = imageUrl(image);

                return (
                  <article key={image.id} className={cx("svx-product-images-image-card", image.isPrimary && "is-primary")}>
                    <button
                      type="button"
                      className="svx-product-images-image-preview"
                      onClick={() => setPreviewImage(image)}
                    >
                      <img src={url} alt={image.altText || product?.name || "Product image"} />
                      <span>
                        <Eye size={15} strokeWidth={2.3} />
                        View full image
                      </span>
                    </button>

                    <footer>
                      <StatusBadge tone={image.isPrimary ? "success" : "neutral"}>
                        {image.isPrimary ? "Feature image" : "Product image"}
                      </StatusBadge>

                      <div className="svx-product-images-card-actions">
                        <button
                          type="button"
                          className="svx-product-images-card-action"
                          onClick={() => setPreviewImage(image)}
                        >
                          <Eye size={14} strokeWidth={2.35} />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          className="svx-product-images-card-action"
                          onClick={() => handleSetPrimary(image)}
                          disabled={imageActionBusy || image.isPrimary}
                        >
                          <Star size={14} strokeWidth={2.35} />
                          <span>{image.isPrimary ? "Featured" : "Feature"}</span>
                        </button>

                        <button
                          type="button"
                          className="svx-product-images-card-action is-danger"
                          onClick={() => handleDeleteImage(image)}
                          disabled={imageActionBusy}
                        >
                          <Trash2 size={14} strokeWidth={2.35} />
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
              className={cx("svx-product-images-upload-zone", dragging && "is-dragging")}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              disabled={uploading}
            >
              <span aria-hidden="true">
                <ImagePlus size={28} strokeWidth={2.25} />
              </span>
              <strong>{uploading ? "Uploading images..." : dragging ? "Drop images here" : "Drag images here or click to add images"}</strong>
              <small>Add one or many images. JPG, PNG, or WEBP. Maximum 5MB per image.</small>
            </button>
          )}
        </section>

        <Link to={`/app/inventory/${id}`} className="svx-product-images-bottom-link">
          <PackageCheck size={16} strokeWidth={2.35} />
          Back to product details
        </Link>
      </div>

      <FullImageViewer
        image={previewImage}
        productName={product?.name || "Product image"}
        onClose={() => setPreviewImage(null)}
        onSetPrimary={handleSetPrimary}
        onDelete={handleDeleteImage}
        busy={imageActionBusy}
      />
    </main>
  );
}
