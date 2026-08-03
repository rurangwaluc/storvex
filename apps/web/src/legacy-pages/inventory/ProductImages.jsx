import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  ImagePlus,
  Loader2,
  MoreHorizontal,
  RefreshCw,
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
import {
  getStoreProfile,
} from "../../services/storeApi";
import {
  getActiveBranchId,
} from "../../services/apiClient";
import {
  inventoryQueryKeys,
  unwrapProductResponse,
} from "../../lib/inventoryQueryKeys";
import ConfirmDialog from "../../components/feedback/ConfirmDialog";
import { handleSubscriptionBlockedError } from "../../utils/subscriptionError";
import "./ProductImages.css";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
}

function formatNumber(value) {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0);
}

function productDescription(product) {
  const values = [
    cleanString(product?.brand),
    cleanString(product?.category),
  ].filter(Boolean);

  return values.length
    ? values.join(" / ")
    : "Stock item";
}

function imageUrl(image) {
  return cleanString(
    image?.url ||
      image?.publicUrl ||
      image?.imageUrl,
  );
}

function imageType(image) {
  return (
    cleanString(
      image?.imageType,
    ).toUpperCase() ||
    "ORIGINAL"
  );
}

function isPreparedImage(image) {
  return imageType(image) === "CLEANED";
}

function validateImageFile(file) {
  if (!file) {
    return "Choose a photo first";
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Use a JPG, PNG, or WEBP photo";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Each photo must be 10MB or smaller";
  }

  return "";
}

function ImageFallback({
  compact = false,
}) {
  return (
    <div
      className={cx(
        "svx-product-images-fallback",
        compact && "is-compact",
      )}
    >
      <ImagePlus
        size={compact ? 20 : 30}
        strokeWidth={1.8}
      />
      <span>Photo unavailable</span>
    </div>
  );
}

function ProductPhoto({
  image,
  alt,
  compact = false,
  onAvailabilityChange,
}) {
  const [failed, setFailed] =
    useState(false);

  const url = imageUrl(image);

  useEffect(() => {
    setFailed(false);

    if (!url) {
      onAvailabilityChange?.(false);
    }
  }, [
    onAvailabilityChange,
    url,
  ]);

  if (!url || failed) {
    return (
      <ImageFallback
        compact={compact}
      />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      onLoad={() =>
        onAvailabilityChange?.(true)
      }
      onError={() => {
        setFailed(true);
        onAvailabilityChange?.(false);
      }}
    />
  );
}

function LoadingButton({
  children,
  icon: Icon,
  loading = false,
  disabled = false,
  tone = "secondary",
  onClick,
}) {
  return (
    <button
      type="button"
      className={cx(
        "svx-product-images-button",
        `is-${tone}`,
      )}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <Loader2
          size={16}
          className="svx-product-images-spin"
        />
      ) : Icon ? (
        <Icon
          size={16}
          strokeWidth={2.2}
        />
      ) : null}

      <span>{children}</span>
    </button>
  );
}

function PhotoStatus({
  image,
  compact = false,
}) {
  let label = "Not prepared";
  let state = "muted";

  if (image?.isPrimary) {
    label = compact
      ? "Main Marketplace photo"
      : "This is the main Marketplace photo";
    state = "main";
  } else if (image?.isMarketplaceApproved) {
    label = compact
      ? "Ready for marketplace"
      : "Approved and visible on Marketplace";
    state = "approved";
  } else if (image) {
    label = compact
      ? "Private preview ready"
      : "Private preview ready for review";
    state = "review";
  }

  return (
    <span
      className={cx(
        "svx-product-images-status",
        `is-${state}`,
        compact && "is-compact",
      )}
    >
      {label}
    </span>
  );
}

function FullImageViewer({
  image,
  productName,
  busy,
  onClose,
  onSetPrimary,
  onDelete,
}) {
  useEffect(() => {
    if (!image) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow =
      "hidden";

    window.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [image, onClose]);

  if (!image) return null;

  const prepared =
    isPreparedImage(image);

  const approved =
    Boolean(
      image.isMarketplaceApproved,
    );

  return (
    <div
      className="svx-product-images-viewer-layer"
      role="dialog"
      aria-modal="true"
      aria-label="Product photo preview"
    >
      <button
        type="button"
        className="svx-product-images-viewer-backdrop"
        onClick={onClose}
        aria-label="Close preview"
      />

      <section className="svx-product-images-viewer">
        <header>
          <div>
            <span>
              {prepared
                ? "Marketplace preview"
                : "Original photo"}
            </span>
            <h2>{productName}</h2>
          </div>

          <button
            type="button"
            className="svx-product-images-icon-button"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X
              size={19}
              strokeWidth={2.3}
            />
          </button>
        </header>

        <div className="svx-product-images-viewer-image">
          <ProductPhoto
            image={image}
            alt={
              image.altText ||
              productName
            }
          />
        </div>

        <footer>
          <LoadingButton
            icon={Star}
            onClick={() =>
              onSetPrimary(image)
            }
            disabled={
              busy ||
              image.isPrimary ||
              (prepared && !approved)
            }
          >
            {image.isPrimary
              ? "Main photo"
              : prepared && !approved
                ? "Approve before using as main"
                : "Use as main photo"}
          </LoadingButton>

          <LoadingButton
            icon={Trash2}
            tone="danger"
            onClick={() =>
              onDelete(image)
            }
            disabled={busy}
          >
            Delete photo
          </LoadingButton>
        </footer>
      </section>
    </div>
  );
}

export default function ProductImages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  const activeBranchId =
    getActiveBranchId() || "default";
  const queryClient = useQueryClient();

  const productQuery = useQuery({
    queryKey: inventoryQueryKeys.product(
      activeBranchId,
      id,
    ),
    queryFn: async () => {
      const response = await getProductById(id);

      return unwrapProductResponse(response);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const storeProfileQuery = useQuery({
    queryKey:
      inventoryQueryKeys.storeProfile(),
    queryFn: async () => {
      const response = await getStoreProfile();

      return (
        response?.profile ||
        response?.tenant ||
        response ||
        null
      );
    },
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const product =
    productQuery.data || null;

  const businessProfile =
    storeProfileQuery.data || null;

  const imagesQuery = useQuery({
    queryKey:
      inventoryQueryKeys.productImages(id),
    queryFn: async () => {
      const response = await getProductImages(id);

      return Array.isArray(response?.images)
        ? response.images
        : [];
    },
    enabled: Boolean(id),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const studioQuery = useQuery({
    queryKey:
      inventoryQueryKeys.productImageStudio(id),
    queryFn: async () => {
      const response =
        await getProductImageStudio(id);

      return response?.studio || null;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const images = imagesQuery.data || [];
  const studio = studioQuery.data || null;
  const studioLoading = studioQuery.isPending;
  const studioError =
    studioQuery.error?.message || "";

  const [uploading, setUploading] =
    useState(false);

  const [
    imageActionBusy,
    setImageActionBusy,
  ] = useState("");

  const [
    previewImage,
    setPreviewImage,
  ] = useState(null);

  const [dragging, setDragging] =
    useState(false);

  const [
    selectedOriginalId,
    setSelectedOriginalId,
  ] = useState("");

  const [
    actionsOpen,
    setActionsOpen,
  ] = useState(false);

  const [
    confirmation,
    setConfirmation,
  ] = useState(null);

  const confirmationResolverRef =
    useRef(null);

  const [
    preparedPreviewAvailable,
    setPreparedPreviewAvailable,
  ] = useState(false);

  const reloadImageWorkspace =
    useCallback(async () => {
      const [
        imagesResult,
        studioResult,
      ] = await Promise.all([
        imagesQuery.refetch(),
        studioQuery.refetch(),
      ]);

      const nextImages =
        imagesResult.data || [];

      const nextStudio =
        studioResult.data || null;

      if (previewImage?.id) {
        const combined = [
          ...(nextStudio?.images || []),
          ...nextImages,
        ];

        setPreviewImage(
          combined.find(
            (image) =>
              image.id === previewImage.id,
          ) || null,
        );
      }

      return {
        images: nextImages,
        studio: nextStudio,
      };
    }, [
      imagesQuery,
      previewImage?.id,
      studioQuery,
    ]);

  useEffect(() => {
    function closeMenu(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target,
        )
      ) {
        setActionsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      closeMenu,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeMenu,
      );
    };
  }, []);

  function requestConfirmation(options) {
    return new Promise((resolve) => {
      confirmationResolverRef.current =
        resolve;

      setConfirmation(options);
    });
  }

  function finishConfirmation(result) {
    const resolve =
      confirmationResolverRef.current;

    confirmationResolverRef.current =
      null;

    setConfirmation(null);
    resolve?.(result);
  }

  async function uploadFiles(files) {
    const imageFiles = Array.from(
      files || [],
    );

    if (
      !imageFiles.length ||
      uploading
    ) {
      return;
    }

    const invalid =
      imageFiles
        .map(validateImageFile)
        .find(Boolean);

    if (invalid) {
      toast.error(invalid);
      return;
    }

    setUploading(true);

    try {
      for (
        const [index, file]
        of imageFiles.entries()
      ) {
        await uploadProductImage(
          id,
          file,
          {
            altText:
              product?.name ||
              file.name,
            sortOrder:
              images.length +
              index,
            isPrimary:
              images.length === 0 &&
              index === 0,
          },
        );
      }

      const workspace =
        await reloadImageWorkspace();

      const nextOriginals =
        (
          workspace.studio?.images ||
          workspace.images ||
          []
        ).filter(
          (image) =>
            !isPreparedImage(image),
        );

      if (nextOriginals.length) {
        setSelectedOriginalId(
          nextOriginals[
            nextOriginals.length - 1
          ].id,
        );
      }

      toast.success(
        imageFiles.length === 1
          ? "Photo uploaded"
          : "Photos uploaded",
      );
    } catch (error) {
      if (
        handleSubscriptionBlockedError(
          error,
          {
            toastId:
              "product-images-upload-blocked",
          },
        )
      ) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to upload product photo",
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

    const currentTarget =
      event.currentTarget;

    const relatedTarget =
      event.relatedTarget;

    if (
      !currentTarget ||
      !relatedTarget ||
      !currentTarget.contains(
        relatedTarget,
      )
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
        event.dataTransfer?.files ||
          [],
      ),
    );
  }

  async function handleSetPrimary(
    image,
  ) {
    if (
      !image?.id ||
      imageActionBusy
    ) {
      return;
    }

    const prepared =
      isPreparedImage(image);

    if (
      prepared &&
      !image.isMarketplaceApproved
    ) {
      toast.error(
        "Approve this photo before using it as the main photo",
      );
      return;
    }

    setImageActionBusy(
      `main-${image.id}`,
    );

    try {
      if (prepared) {
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

      toast.success(
        "Main product photo updated",
      );
    } catch (error) {
      if (
        handleSubscriptionBlockedError(
          error,
          {
            toastId:
              "product-images-primary-blocked",
          },
        )
      ) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to update the main photo",
      );
    } finally {
      setImageActionBusy("");
    }
  }

  async function handleDeleteImage(
    image,
  ) {
    if (
      !image?.id ||
      imageActionBusy
    ) {
      return;
    }

    const prepared =
      isPreparedImage(image);

    const confirmed =
      await requestConfirmation({
        title: prepared
          ? "Delete prepared photo?"
          : "Delete original photo?",
        description: prepared
          ? "This prepared Marketplace version will be removed. This action cannot be undone."
          : "This original photo and its prepared version will be removed. This action cannot be undone.",
        confirmLabel: "Delete photo",
        tone: "danger",
      });

    if (!confirmed) return;

    setImageActionBusy(
      `delete-${image.id}`,
    );

    try {
      await deleteProductImage(
        id,
        image.id,
      );

      const workspace =
        await reloadImageWorkspace();

      setPreviewImage(null);
      setActionsOpen(false);

      const remainingOriginals =
        (
          workspace.studio?.images ||
          workspace.images ||
          []
        ).filter(
          (item) =>
            !isPreparedImage(item),
        );

      if (
        image.id ===
        selectedOriginalId
      ) {
        setSelectedOriginalId(
          remainingOriginals[0]?.id ||
            "",
        );
      }

      toast.success("Photo deleted");
    } catch (error) {
      if (
        handleSubscriptionBlockedError(
          error,
          {
            toastId:
              "product-images-delete-blocked",
          },
        )
      ) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to delete photo",
      );
    } finally {
      setImageActionBusy("");
    }
  }

  async function handlePrepareImage(
    image,
  ) {
    if (
      !image?.id ||
      imageActionBusy
    ) {
      return;
    }

    const currentResult =
      preparedForOriginal(image.id);

    if (currentResult) {
      const confirmed =
        await requestConfirmation({
          title: "Prepare this photo again?",
          description:
            currentResult.isMarketplaceApproved ||
            currentResult.isPrimary
              ? "The approved or main Marketplace version will be replaced. The new version will need to be reviewed and approved again."
              : "The current private preview will be replaced with a newly prepared version.",
          confirmLabel: "Prepare again",
        });

      if (!confirmed) return;
    }

    setImageActionBusy(
      `clean-${image.id}`,
    );

    try {
      await cleanProductImage(
        id,
        image.id,
      );

      await reloadImageWorkspace();

      toast.success(
        currentResult
          ? "New version ready to review"
          : "Photo ready to review",
      );
    } catch (error) {
      if (
        handleSubscriptionBlockedError(
          error,
          {
            toastId:
              "product-images-clean-blocked",
          },
        )
      ) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to prepare photo",
      );
    } finally {
      setImageActionBusy("");
    }
  }

  async function handleApproveImage(
    image,
  ) {
    if (
      !image?.id ||
      imageActionBusy
    ) {
      return;
    }

    if (
      image.id === selectedPrepared?.id &&
      !preparedPreviewAvailable
    ) {
      toast.error(
        "The prepared photo is unavailable. Prepare the original photo again before approving.",
      );

      return;
    }

    setImageActionBusy(
      `approval-${image.id}`,
    );

    try {
      await approveProductImageForListing(
        id,
        image.id,
      );

      await reloadImageWorkspace();

      toast.success(
        "Photo approved for marketplace",
      );
    } catch (error) {
      if (
        handleSubscriptionBlockedError(
          error,
          {
            toastId:
              "product-images-approve-blocked",
          },
        )
      ) {
        return;
      }

      toast.error(
        error?.message ||
          "Failed to approve photo",
      );
    } finally {
      setImageActionBusy("");
    }
  }

  async function handleRemoveApproval(
    image,
  ) {
    if (
      !image?.id ||
      imageActionBusy
    ) {
      return;
    }

    const confirmed =
      await requestConfirmation({
        title: "Remove photo from Marketplace?",
        description:
          "Customers will no longer see this photo. The private prepared version will remain available for another review.",
        confirmLabel: "Remove from marketplace",
        tone: "danger",
      });

    if (!confirmed) return;

    setImageActionBusy(
      `approval-${image.id}`,
    );

    try {
      await removeProductImageListingApproval(
        id,
        image.id,
      );

      await reloadImageWorkspace();

      toast.success(
        "Photo removed from Marketplace",
      );
    } catch (error) {
      if (
        handleSubscriptionBlockedError(
          error,
          {
            toastId:
              "product-images-remove-approval-blocked",
          },
        )
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

  const sourceImages =
    Array.isArray(studio?.images) &&
    studio.images.length
      ? studio.images
      : images;

  const originalImages =
    useMemo(
      () =>
        sourceImages.filter(
          (image) =>
            !isPreparedImage(image),
        ),
      [sourceImages],
    );

  const preparedImages =
    useMemo(
      () =>
        sourceImages.filter(
          isPreparedImage,
        ),
      [sourceImages],
    );

  function imageTimestamp(image) {
    const value =
      image?.updatedAt ||
      image?.createdAt ||
      "";

    const timestamp =
      new Date(value).getTime();

    return Number.isFinite(timestamp)
      ? timestamp
      : 0;
  }

  function preparedForOriginal(
    originalId,
  ) {
    return (
      preparedImages
        .filter(
          (image) =>
            cleanString(
              image.sourceImageId,
            ) ===
            cleanString(originalId),
        )
        .sort((left, right) => {
          const versionDifference =
            Number(
              right?.studioVersion ||
                0,
            ) -
            Number(
              left?.studioVersion ||
                0,
            );

          if (versionDifference) {
            return versionDifference;
          }

          return (
            imageTimestamp(right) -
            imageTimestamp(left)
          );
        })[0] || null
    );
  }

  const selectedOriginal =
    originalImages.find(
      (image) =>
        image.id ===
        selectedOriginalId,
    ) ||
    originalImages.find(
      (image) => image.isPrimary,
    ) ||
    originalImages[0] ||
    null;

  const selectedPrepared =
    selectedOriginal
      ? preparedForOriginal(
          selectedOriginal.id,
        )
      : null;

  useEffect(() => {
    if (
      selectedOriginal &&
      selectedOriginal.id !==
        selectedOriginalId
    ) {
      setSelectedOriginalId(
        selectedOriginal.id,
      );
    }
  }, [
    selectedOriginal,
    selectedOriginalId,
  ]);

  const approvedCount =
    preparedImages.filter(
      (image) =>
        image.isMarketplaceApproved,
    ).length;

  const workspaceBusy =
    Boolean(imageActionBusy);

  const prepareBusy =
    selectedOriginal &&
    imageActionBusy ===
      `clean-${selectedOriginal.id}`;

  const approvalBusy =
    selectedPrepared &&
    imageActionBusy ===
      `approval-${selectedPrepared.id}`;

  const mainBusy =
    selectedPrepared &&
    imageActionBusy ===
      `main-${selectedPrepared.id}`;

  const deleteBusy =
    selectedPrepared &&
    imageActionBusy ===
      `delete-${selectedPrepared.id}`;

  const initialLoading =
    productQuery.isPending ||
    storeProfileQuery.isPending ||
    imagesQuery.isPending ||
    studioQuery.isPending;

  const initialError =
    productQuery.error ||
    storeProfileQuery.error ||
    imagesQuery.error;

  if (initialError) {
    console.error(
      "Product Photos initial load failed:",
      initialError,
    );
  }

  if (initialLoading && !product) {
    return (
      <main className="svx-product-images-page">
        <div className="svx-product-images-shell">
          <div className="svx-product-images-loading-head" />

          <div className="svx-product-images-loading-row">
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="svx-product-images-loading-card" />
        </div>
      </main>
    );
  }

  return (
    <main className="svx-product-images-page">
      <div className="svx-product-images-shell">
        <header className="svx-product-images-header">
          <div>
            <button
              type="button"
              className="svx-product-images-back"
              onClick={() =>
                navigate(
                  `/app/inventory/${id}`,
                )
              }
            >
              <ArrowLeft
                size={17}
                strokeWidth={2.3}
              />
              <span>Product details</span>
            </button>

            <h1>Product photos</h1>

            <p>
              Add, prepare, and choose the photos customers
              will see for this product.
            </p>
          </div>

          <LoadingButton
            icon={UploadCloud}
            tone="primary"
            loading={uploading}
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            Upload photos
          </LoadingButton>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={handleUploadFiles}
          />
        </header>

        <section className="svx-product-images-product">
          <div className="svx-product-images-product-copy">
            <strong>
              {product?.name || "Product"}
            </strong>
            <span>
              {productDescription(product)}
            </span>
          </div>

          <dl className="svx-product-images-product-facts">
            <div>
              <dt>Photos added</dt>
              <dd>
                {formatNumber(
                  originalImages.length,
                )}
              </dd>
            </div>

            <div>
              <dt>Ready for marketplace</dt>
              <dd>
                {formatNumber(
                  approvedCount,
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="svx-product-images-library">
          <div className="svx-product-images-section-head">
            <div>
              <h2>Your photos</h2>
              <p>
                Select a photo to prepare it, approve it,
                or choose it as the main product photo.
              </p>
            </div>

            {originalImages.length ? (
              <span className="svx-product-images-library-count">
                {originalImages.length}{" "}
                {originalImages.length === 1
                  ? "photo"
                  : "photos"}
              </span>
            ) : null}
          </div>

          {originalImages.length ? (
            <div
              className={cx(
                "svx-product-images-thumbnail-strip",
                dragging && "is-dragging",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {originalImages.map(
                (original) => {
                  const prepared =
                    preparedForOriginal(
                      original.id,
                    );

                  const active =
                    selectedOriginal?.id ===
                    original.id;

                  return (
                    <button
                      key={original.id}
                      type="button"
                      className={cx(
                        "svx-product-images-thumbnail",
                        active && "is-active",
                      )}
                      onClick={() =>
                        setSelectedOriginalId(
                          original.id,
                        )
                      }
                    >
                      <span className="svx-product-images-thumbnail-media">
                        <ProductPhoto
                          image={original}
                          compact
                          alt={
                            original.altText ||
                            product?.name ||
                            "Product photo"
                          }
                        />
                      </span>

                      <span className="svx-product-images-thumbnail-copy">
                        <strong>
                          {original.isPrimary
                            ? "Main product photo"
                            : "Product photo"}
                        </strong>

                        <PhotoStatus
                          image={prepared}
                          compact
                        />
                      </span>

                      {active ? (
                        <span
                          className="svx-product-images-thumbnail-check"
                          aria-hidden="true"
                        >
                          <Check
                            size={13}
                            strokeWidth={3}
                          />
                        </span>
                      ) : null}
                    </button>
                  );
                },
              )}

              <button
                type="button"
                className="svx-product-images-thumbnail-add"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2
                    size={20}
                    className="svx-product-images-spin"
                  />
                ) : (
                  <ImagePlus
                    size={21}
                    strokeWidth={2}
                  />
                )}

                <span>
                  {uploading
                    ? "Uploading"
                    : "Add photos"}
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={cx(
                "svx-product-images-empty-upload",
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
              <span>
                {uploading ? (
                  <Loader2
                    size={25}
                    className="svx-product-images-spin"
                  />
                ) : (
                  <ImagePlus
                    size={26}
                    strokeWidth={2}
                  />
                )}
              </span>

              <strong>
                {uploading
                  ? "Uploading photos"
                  : dragging
                    ? "Drop photos here"
                    : "Add your first product photo"}
              </strong>

              <small>
                JPG, PNG, or WEBP. Up to
                10MB each.
              </small>
            </button>
          )}
        </section>

        <section className="svx-product-images-workspace">
          <div className="svx-product-images-section-head">
            <div>
              <h2>Selected photo</h2>
              <p>
                Compare the uploaded photo with the version
                customers will see.
              </p>
            </div>

            <PhotoStatus
              image={selectedPrepared}
            />
          </div>
          <div className="svx-product-images-process-note">
            <strong>
              {!selectedOriginal
                ? "Next step: Add a product photo"
                : !selectedPrepared
                  ? "Next step: Prepare this photo"
                  : selectedPrepared.isMarketplaceApproved
                    ? "Ready for marketplace"
                    : "Next step: Review and approve"}
            </strong>

            <p>
              {!selectedOriginal
                ? "Upload a clear photo to begin."
                : !selectedPrepared
                  ? "Create the customer-facing version while keeping the uploaded photo unchanged."
                  : selectedPrepared.isMarketplaceApproved
                    ? "Customers can see this photo when the product is published."
                    : "Check the customer photo and approve it when it looks correct."}
            </p>
          </div>

          {studioLoading ? (
            <div className="svx-product-images-workspace-message">
              <Loader2
                size={20}
                className="svx-product-images-spin"
              />
              <span>
                Loading photo workspace
              </span>
            </div>
          ) : studioError ? (
            <div className="svx-product-images-workspace-message is-error">
              <strong>
                Photo preparation is unavailable
              </strong>
              <span>{studioError}</span>

              <LoadingButton
                icon={RefreshCw}
                onClick={loadStudio}
              >
                Try again
              </LoadingButton>
            </div>
          ) : !selectedOriginal ? (
            <div className="svx-product-images-workspace-message">
              <ImagePlus
                size={23}
                strokeWidth={2}
              />
              <strong>
                Upload a photo to begin
              </strong>
              <span>
                Your original photo stays
                unchanged.
              </span>
            </div>
          ) : (
            <>
              <div
                className={cx(
                  "svx-product-images-comparison",
                  !selectedPrepared &&
                    "has-no-result",
                )}
              >
                <article className="svx-product-images-preview-panel">
                  <header>
                    <div>
                      <span>Uploaded photo</span>
                      <strong>
                        Uploaded photo
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="svx-product-images-preview-link"
                      onClick={() =>
                        setPreviewImage(
                          selectedOriginal,
                        )
                      }
                    >
                      <Eye
                        size={15}
                        strokeWidth={2.2}
                      />
                      View
                    </button>
                  </header>

                  <button
                    type="button"
                    className="svx-product-images-large-photo"
                    onClick={() =>
                      setPreviewImage(
                        selectedOriginal,
                      )
                    }
                  >
                    <ProductPhoto
                      image={selectedOriginal}
                      alt={
                        selectedOriginal.altText ||
                        product?.name ||
                        "Original product photo"
                      }
                    />
                  </button>
                </article>

                <article className="svx-product-images-preview-panel is-result">
                  <header>
                    <div>
                      <span>
                        Marketplace preview
                      </span>
                      <strong>
                        {selectedPrepared
                          ? selectedPrepared.isMarketplaceApproved
                            ? "Ready for marketplace"
                            : "Waiting for approval"
                          : "Not prepared yet"}
                      </strong>
                    </div>

                    {selectedPrepared ? (
                      <button
                        type="button"
                        className="svx-product-images-preview-link"
                        onClick={() =>
                          setPreviewImage(
                            selectedPrepared,
                          )
                        }
                      >
                        <Eye
                          size={15}
                          strokeWidth={2.2}
                        />
                        View
                      </button>
                    ) : null}
                  </header>

                  {selectedPrepared ? (
                    <button
                      type="button"
                      className="svx-product-images-large-photo"
                      onClick={() =>
                        setPreviewImage(
                          selectedPrepared,
                        )
                      }
                    >
                      <ProductPhoto
                        image={selectedPrepared}
                        alt={
                          selectedPrepared.altText ||
                          product?.name ||
                          "Marketplace product photo"
                        }
                        onAvailabilityChange={
                          setPreparedPreviewAvailable
                        }
                      />
                    </button>
                  ) : (
                    <div className="svx-product-images-result-empty">
                      <ImagePlus
                        size={27}
                        strokeWidth={1.8}
                      />
                      <strong>
                        Prepare this photo
                      </strong>
                      <span>
                        Storvex will resize,
                        compress, and create the
                        Marketplace preview.
                      </span>
                    </div>
                  )}
                </article>
              </div>

              <div className="svx-product-images-workspace-footer">
                <div className="svx-product-images-workspace-copy">
                  <strong>
                    {!selectedPrepared
                      ? "Ready to prepare"
                      : selectedPrepared.isMarketplaceApproved
                        ? "Ready for marketplace"
                        : "Review before approving"}
                  </strong>

                  <span>
                    {!selectedPrepared
                      ? "Your original photo will remain unchanged."
                      : selectedPrepared.isMarketplaceApproved
                        ? "Customers can now see this photo on the product listing."
                        : "Check the preview and approve it when it looks right."}
                  </span>
                </div>

                <div className="svx-product-images-workspace-actions">
                  {!selectedPrepared ? (
                    <LoadingButton
                      icon={RefreshCw}
                      tone="primary"
                      loading={prepareBusy}
                      disabled={workspaceBusy}
                      onClick={() =>
                        handlePrepareImage(
                          selectedOriginal,
                        )
                      }
                    >
                      Prepare photo
                    </LoadingButton>
                  ) : selectedPrepared.isMarketplaceApproved ? (
                    <>
                      <LoadingButton
                        icon={RefreshCw}
                        loading={prepareBusy}
                        disabled={workspaceBusy}
                        onClick={() =>
                          handlePrepareImage(
                            selectedOriginal,
                          )
                        }
                      >
                        Prepare again
                      </LoadingButton>

                      {!selectedPrepared.isPrimary ? (
                        <LoadingButton
                          icon={Star}
                          tone="primary"
                          loading={mainBusy}
                          disabled={workspaceBusy}
                          onClick={() =>
                            handleSetPrimary(
                              selectedPrepared,
                            )
                          }
                        >
                          Use as main photo
                        </LoadingButton>
                      ) : (
                        <span className="svx-product-images-main-confirmation">
                          <Star
                            size={15}
                            strokeWidth={2.3}
                          />
                          Main product photo
                        </span>
                      )}

                      <LoadingButton
                        icon={X}
                        loading={approvalBusy}
                        disabled={workspaceBusy}
                        onClick={() =>
                          handleRemoveApproval(
                            selectedPrepared,
                          )
                        }
                      >
                        Remove from Marketplace
                      </LoadingButton>
                    </>
                  ) : (
                    <>
                      <LoadingButton
                        icon={RefreshCw}
                        loading={prepareBusy}
                        disabled={workspaceBusy}
                        onClick={() =>
                          handlePrepareImage(
                            selectedOriginal,
                          )
                        }
                      >
                        Prepare again
                      </LoadingButton>

                      <LoadingButton
                        icon={Check}
                        tone="primary"
                        loading={approvalBusy}
                        disabled={
                          workspaceBusy ||
                          !preparedPreviewAvailable
                        }
                        onClick={() =>
                          handleApproveImage(
                            selectedPrepared,
                          )
                        }
                      >
                        {preparedPreviewAvailable
                          ? "Approve for marketplace"
                          : "Photo unavailable"}
                      </LoadingButton>
                    </>
                  )}

                  <div
                    className="svx-product-images-more"
                    ref={menuRef}
                  >
                    <button
                      type="button"
                      className="svx-product-images-more-button"
                      onClick={() =>
                        setActionsOpen(
                          (current) =>
                            !current,
                        )
                      }
                      aria-expanded={
                        actionsOpen
                      }
                      aria-label="More photo actions"
                    >
                      <MoreHorizontal
                        size={19}
                        strokeWidth={2.2}
                      />
                      <ChevronDown
                        size={13}
                        strokeWidth={2.5}
                      />
                    </button>

                    {actionsOpen ? (
                      <div className="svx-product-images-more-menu">
                        <button
                          type="button"
                          onClick={() => {
                            setActionsOpen(false);
                            handlePrepareImage(
                              selectedOriginal,
                            );
                          }}
                          disabled={workspaceBusy}
                        >
                          <RefreshCw
                            size={15}
                            strokeWidth={2.2}
                          />
                          <span>
                            {selectedPrepared
                              ? "Prepare again"
                              : "Prepare photo"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActionsOpen(false);
                            setPreviewImage(
                              selectedOriginal,
                            );
                          }}
                        >
                          <Eye
                            size={15}
                            strokeWidth={2.2}
                          />
                          <span>
                            View original
                          </span>
                        </button>

                        <button
                          type="button"
                          className="is-danger"
                          onClick={() => {
                            setActionsOpen(false);
                            handleDeleteImage(
                              selectedPrepared ||
                                selectedOriginal,
                            );
                          }}
                          disabled={
                            workspaceBusy ||
                            deleteBusy
                          }
                        >
                          <Trash2
                            size={15}
                            strokeWidth={2.2}
                          />
                          <span>
                            Delete{" "}
                            {selectedPrepared
                              ? "prepared photo"
                              : "original photo"}
                          </span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

      </div>

      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title || ""}
        description={
          confirmation?.description || ""
        }
        confirmLabel={
          confirmation?.confirmLabel ||
          "Continue"
        }
        cancelLabel={
          confirmation?.cancelLabel ||
          "Cancel"
        }
        tone={
          confirmation?.tone ||
          "default"
        }
        loading={false}
        onConfirm={() =>
          finishConfirmation(true)
        }
        onCancel={() =>
          finishConfirmation(false)
        }
      />

      <FullImageViewer
        image={previewImage}
        productName={
          product?.name ||
          "Product photo"
        }
        onClose={() =>
          setPreviewImage(null)
        }
        onSetPrimary={
          handleSetPrimary
        }
        onDelete={handleDeleteImage}
        busy={workspaceBusy}
      />
    </main>
  );
}
