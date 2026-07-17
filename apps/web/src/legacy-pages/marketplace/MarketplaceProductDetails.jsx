import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  GitCompareArrows,
  Heart,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import toast from "react-hot-toast";

import {
  getMarketplaceProduct,
  listMarketplaceProducts,
} from "../../services/marketplaceApi";
import {
  MarketplaceFooter,
  MarketplaceHeader,
  formatMoney,
  marketplaceErrorMessage,
} from "./MarketplaceHome";
import {
  marketplaceProductKey,
  syncMarketplaceProductSnapshots,
  useMarketplaceCustomerStore,
} from "./marketplaceCustomerStore";
import {
  marketplaceComparisonFields,
  marketplaceDiscountPercent,
  marketplaceFieldValue,
} from "./marketplaceCategoryDefinitions";

import "../public/LandingPage.css";
import "./MarketplacePublic.css";
import "./MarketplaceProductDetails.css";

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

function cleanString(value) {
  return String(value || "").trim();
}

function imageUrl(image) {
  return cleanString(image?.url || image);
}

function storeLocation(store) {
  return [
    store?.location?.address,
    store?.location?.sector,
    store?.location?.district,
  ]
    .map(cleanString)
    .filter(Boolean)
    .join(", ");
}

function whatsappUrl(phone) {
  const digits = cleanString(phone).replace(/\D+/g, "");

  if (!digits) return "";

  return `https://wa.me/${digits}`;
}

function ProductDetailsSkeleton() {
  return (
    <main
      className="svx-product-skeleton"
      aria-label="Loading product details"
      aria-busy="true"
    >
      <div className="svx-product-skeleton-breadcrumb">
        <span />
        <span />
        <span />
      </div>

      <section className="svx-product-skeleton-hero">
        <div className="svx-product-skeleton-gallery">
          <div className="svx-product-skeleton-image svx-skeleton-shape" />

          <div className="svx-product-skeleton-thumbnails">
            {Array.from({ length: 3 }).map((_, index) => (
              <span
                key={index}
                className="svx-skeleton-shape"
              />
            ))}
          </div>
        </div>

        <div className="svx-product-skeleton-summary">
          <div className="svx-product-skeleton-store">
            <span className="svx-skeleton-shape" />

            <div>
              <i className="svx-skeleton-shape" />
              <i className="svx-skeleton-shape" />
            </div>
          </div>

          <div className="svx-product-skeleton-title">
            <span className="svx-skeleton-shape" />
            <span className="svx-skeleton-shape" />
          </div>

          <div className="svx-product-skeleton-copy">
            <span className="svx-skeleton-shape" />
            <span className="svx-skeleton-shape" />
          </div>

          <div className="svx-product-skeleton-price svx-skeleton-shape" />

          <div className="svx-product-skeleton-availability">
            <span className="svx-skeleton-shape" />

            <div>
              <i className="svx-skeleton-shape" />
              <i className="svx-skeleton-shape" />
            </div>
          </div>

          <div className="svx-product-skeleton-buy">
            <span className="svx-skeleton-shape" />
            <span className="svx-skeleton-shape" />
          </div>

          <div className="svx-product-skeleton-actions">
            <span className="svx-skeleton-shape" />
            <span className="svx-skeleton-shape" />
          </div>

          <div className="svx-product-skeleton-fulfilment">
            <span className="svx-skeleton-shape" />

            <div>
              <i className="svx-skeleton-shape" />
              <i className="svx-skeleton-shape" />
            </div>
          </div>
        </div>
      </section>

      <section className="svx-product-skeleton-information">
        {Array.from({ length: 2 }).map((_, index) => (
          <article key={index}>
            <span className="svx-skeleton-shape" />
            <span className="svx-skeleton-shape" />

            <div>
              {Array.from({ length: 4 }).map(
                (_, rowIndex) => (
                  <i
                    key={rowIndex}
                    className="svx-skeleton-shape"
                  />
                ),
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="svx-product-skeleton-related">
        <span className="svx-skeleton-shape" />

        <div>
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index}>
              <i className="svx-skeleton-shape" />
              <i className="svx-skeleton-shape" />
              <i className="svx-skeleton-shape" />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function DetailState({
  icon: Icon,
  title,
  text,
  action,
}) {
  return (
    <main className="svx-product-detail-state">
      <div>
        <Icon size={31} strokeWidth={1.9} />

        <h1>{title}</h1>
        <p>{text}</p>

        {action}
      </div>
    </main>
  );
}

function RelatedProduct({ product }) {
  const url = `/marketplace/${encodeURIComponent(
    product.seller.slug,
  )}/${encodeURIComponent(product.slug)}`;

  return (
    <Link
      to={url}
      className="svx-product-related-card"
    >
      <div className="svx-product-related-image">
        <img
          src={imageUrl(product.image)}
          alt={product.image?.altText || product.title}
          loading="lazy"
        />
      </div>

      <div>
        <small>{product.seller.name}</small>
        <h3>{product.title}</h3>

        <strong>
          {formatMoney(product.price, product.currency)}
        </strong>

        {product.onSale ? (
          <del>
            {formatMoney(
              product.regularPrice,
              product.currency,
            )}
          </del>
        ) : null}
      </div>

      <ChevronRight size={17} />
    </Link>
  );
}

export default function MarketplaceProductDetails() {
  const { storeSlug, productSlug } = useParams();
  const navigate = useNavigate();
  const customerStore = useMarketplaceCustomerStore();

  const [product, setProduct] = useState(null);
  const [store, setStore] = useState(null);
  const [relatedProducts, setRelatedProducts] =
    useState([]);

  const [activeImageIndex, setActiveImageIndex] =
    useState(0);
  const [quantity, setQuantity] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getMarketplaceProduct(
        storeSlug,
        productSlug,
      );

      if (!data?.product || !data?.store) {
        throw new Error(
          "This product is no longer available.",
        );
      }

      setProduct(data.product);
      setStore(data.store);
      setActiveImageIndex(0);
      setQuantity(1);

      syncMarketplaceProductSnapshots([
        data.product,
      ]);

      try {
        const relatedData =
          await listMarketplaceProducts({
            category: data.product.category,
            limit: 5,
          });

        const products = Array.isArray(
          relatedData?.products,
        )
          ? relatedData.products
          : [];

        setRelatedProducts(
          products
            .filter(
              (item) =>
                !(
                  item.slug === data.product.slug &&
                  item.seller?.slug ===
                    data.product.seller?.slug
                ),
            )
            .slice(0, 4),
        );
      } catch {
        setRelatedProducts([]);
      }
    } catch (loadError) {
      setProduct(null);
      setStore(null);
      setRelatedProducts([]);
      setError(
        marketplaceErrorMessage(loadError),
      );
    } finally {
      setLoading(false);
    }
  }, [productSlug, storeSlug]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, [productSlug, storeSlug]);

  useEffect(() => {
    if (!product?.title) return undefined;

    const previousTitle = document.title;
    document.title = `${product.title} | Storvex`;

    return () => {
      document.title = previousTitle;
    };
  }, [product?.title]);

  const images = useMemo(() => {
    if (!product) return [];

    if (
      Array.isArray(product.images) &&
      product.images.length
    ) {
      return product.images;
    }

    return product.image ? [product.image] : [];
  }, [product]);

  const activeImage =
    images[activeImageIndex] || images[0] || null;

  const key = product
    ? marketplaceProductKey(product)
    : "";

  const inCart = key
    ? customerStore.isInCart(key)
    : false;

  const inWishlist = key
    ? customerStore.isInWishlist(key)
    : false;

  const inCompare = key
    ? customerStore.isInCompare(key)
    : false;

  const availableQuantity = Math.max(
    0,
    Number(product?.availableQuantity || 0),
  );

  const storeClosed = Boolean(
    store?.temporarilyClosed ||
      product?.seller?.temporarilyClosed,
  );

  const canAddToCart =
    Boolean(product) &&
    !storeClosed &&
    availableQuantity > 0;

  const discountPercent = product
    ? marketplaceDiscountPercent(product)
    : 0;

  const saving = product?.onSale
    ? Math.max(
        0,
        Number(product.regularPrice || 0) -
          Number(product.price || 0),
      )
    : 0;

  const specificationFields = product
    ? marketplaceComparisonFields([product])
    : [];

  const location = storeLocation(store);
  const whatsapp = whatsappUrl(
    store?.whatsappPhone ||
      store?.customerPhone,
  );

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1),
    );
  }

  function increaseQuantity() {
    setQuantity((current) =>
      Math.min(
        Math.max(1, availableQuantity),
        current + 1,
      ),
    );
  }

  function addToCart() {
    if (!product) return;

    const result = customerStore.addToCart(
      product,
      quantity,
    );

    if (!result.ok) {
      toast.error(
        result.reason === "STORE_CLOSED"
          ? "This store is temporarily closed."
          : "This product is not available.",
      );
      return;
    }

    toast.success(
      `${quantity} ${quantity === 1 ? "item" : "items"} added to cart`,
    );
  }

  function toggleWishlist() {
    if (!product) return;

    const active =
      customerStore.toggleWishlist(product);

    toast.success(
      active
        ? `${product.title} saved to wishlist`
        : `${product.title} removed from wishlist`,
    );
  }

  function toggleCompare() {
    if (!product) return;

    const result =
      customerStore.toggleCompare(product);

    if (result.reason === "LIMIT") {
      toast.error(
        "You can compare up to 4 products.",
      );
      return;
    }

    if (result.reason === "CATEGORY") {
      toast.error(
        "Choose products from the same category.",
      );
      return;
    }

    toast.success(
      result.active
        ? `${product.title} added to comparison`
        : `${product.title} removed from comparison`,
    );
  }

  return (
    <div className="storvex-landing storvex-marketplace svx-product-detail-page">
      <MarketplaceHeader />

      {loading ? (
        <ProductDetailsSkeleton />
      ) : error || !product || !store ? (
        <DetailState
          icon={AlertCircle}
          title="Product unavailable"
          text={
            error ||
            "This product could not be found."
          }
          action={
            <div className="svx-product-state-actions">
              <button
                type="button"
                onClick={loadProduct}
              >
                <RefreshCw size={16} />
                Try again
              </button>

              <Link to="/marketplace">
                Back to Marketplace
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <main className="svx-product-detail-main">
            <nav
              className="svx-product-breadcrumb"
              aria-label="Breadcrumb"
            >
              <Link to="/marketplace">
                Marketplace
              </Link>

              <ChevronRight size={14} />

              {product.category ? (
                <>
                  <Link
                    to={`/marketplace?category=${encodeURIComponent(
                      product.category,
                    )}`}
                  >
                    {product.category}
                  </Link>

                  <ChevronRight size={14} />
                </>
              ) : null}

              <span>{product.title}</span>
            </nav>

            <button
              type="button"
              className="svx-product-back"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={17} />
              Back
            </button>

            <section className="svx-product-detail-hero">
              <div className="svx-product-gallery">
                <div className="svx-product-main-image">
                  <img
                    src={imageUrl(activeImage)}
                    alt={
                      activeImage?.altText ||
                      product.title
                    }
                  />

                  {product.onSale ? (
                    <span className="svx-product-sale-text">
                      {discountPercent}% off
                    </span>
                  ) : null}
                </div>

                {images.length > 1 ? (
                  <div
                    className="svx-product-thumbnails"
                    aria-label="Product images"
                  >
                    {images.map((image, index) => (
                      <button
                        type="button"
                        key={`${imageUrl(image)}-${index}`}
                        className={
                          index === activeImageIndex
                            ? "is-active"
                            : ""
                        }
                        onClick={() =>
                          setActiveImageIndex(index)
                        }
                        aria-label={`Show product image ${index + 1}`}
                        aria-pressed={
                          index === activeImageIndex
                        }
                      >
                        <img
                          src={imageUrl(image)}
                          alt=""
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="svx-product-summary">
                <Link
                  to={`/marketplace/${encodeURIComponent(
                    store.slug,
                  )}`}
                  className="svx-product-store-line"
                >
                  <Store size={16} />

                  <span>
                    <small>Sold by</small>
                    <strong>{store.name}</strong>
                  </span>

                  <ChevronRight size={16} />
                </Link>

                <h1>{product.title}</h1>

                {product.description ? (
                  <p className="svx-product-description">
                    {product.description}
                  </p>
                ) : null}

                <div
                  className={cx(
                    "svx-product-price",
                    product.onSale && "is-sale",
                  )}
                >
                  {product.onSale ? (
                    <small>Sale price</small>
                  ) : null}

                  <div>
                    <strong>
                      {formatMoney(
                        product.price,
                        product.currency,
                      )}
                    </strong>

                    {product.onSale ? (
                      <del>
                        {formatMoney(
                          product.regularPrice,
                          product.currency,
                        )}
                      </del>
                    ) : null}
                  </div>

                  {product.onSale && saving > 0 ? (
                    <span>
                      Save{" "}
                      {formatMoney(
                        saving,
                        product.currency,
                      )}
                    </span>
                  ) : null}
                </div>

                <div className="svx-product-availability">
                  <PackageCheck size={18} />

                  <span>
                    <strong>
                      {storeClosed
                        ? "Store temporarily closed"
                        : `${availableQuantity} available`}
                    </strong>

                    <small>
                      Availability is confirmed before
                      handover.
                    </small>
                  </span>
                </div>

                <div className="svx-product-buy-row">
                  <div
                    className="svx-product-quantity"
                    aria-label="Quantity"
                  >
                    <button
                      type="button"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                      aria-label="Reduce quantity"
                    >
                      <Minus size={16} />
                    </button>

                    <strong>{quantity}</strong>

                    <button
                      type="button"
                      onClick={increaseQuantity}
                      disabled={
                        quantity >= availableQuantity
                      }
                      aria-label="Increase quantity"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <button
                    type="button"
                    className={cx(
                      "svx-product-add-cart",
                      inCart && "is-active",
                    )}
                    onClick={addToCart}
                    disabled={!canAddToCart}
                  >
                    {inCart ? (
                      <Check size={18} />
                    ) : (
                      <ShoppingCart size={18} />
                    )}

                    <span>
                      {storeClosed
                        ? "Store closed"
                        : inCart
                          ? "Add another"
                          : "Add to cart"}
                    </span>
                  </button>
                </div>

                <div className="svx-product-secondary-actions">
                  <button
                    type="button"
                    className={
                      inWishlist ? "is-active" : ""
                    }
                    onClick={toggleWishlist}
                    aria-pressed={inWishlist}
                  >
                    <Heart size={17} />

                    {inWishlist
                      ? "Saved"
                      : "Save product"}
                  </button>

                  <button
                    type="button"
                    className={
                      inCompare ? "is-active" : ""
                    }
                    onClick={toggleCompare}
                    aria-pressed={inCompare}
                  >
                    <GitCompareArrows size={17} />

                    {inCompare
                      ? "In comparison"
                      : "Compare"}
                  </button>
                </div>

                <div className="svx-product-fulfilment">
                  {store.pickupEnabled ? (
                    <div>
                      <Store size={18} />
                      <span>
                        <strong>Store pickup</strong>
                        <small>
                          Confirm the collection time
                          with the store.
                        </small>
                      </span>
                    </div>
                  ) : null}

                  {store.deliveryEnabled ? (
                    <div>
                      <Truck size={18} />
                      <span>
                        <strong>Seller delivery</strong>
                        <small>
                          Delivery details are confirmed
                          directly with the store.
                        </small>
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="svx-product-information">
              <article className="svx-product-info-section">
                <header>
                  <h2>Product details</h2>
                  <p>
                    Important information provided by the
                    seller.
                  </p>
                </header>

                {specificationFields.length ? (
                  <dl className="svx-product-specifications">
                    {specificationFields.map((field) => (
                      <div key={field.key}>
                        <dt>{field.label}</dt>
                        <dd>
                          {marketplaceFieldValue(
                            product,
                            field,
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="svx-product-empty-copy">
                    No additional specifications were
                    provided for this product.
                  </p>
                )}
              </article>

              <article className="svx-product-info-section svx-product-store-info">
                <header>
                  <h2>Store information</h2>
                  <p>
                    Contact and fulfilment details for this
                    seller.
                  </p>
                </header>

                <div className="svx-product-store-heading">
                  <div className="svx-product-store-logo">
                    {store.logoUrl ? (
                      <img
                        src={store.logoUrl}
                        alt=""
                      />
                    ) : (
                      <Store size={24} />
                    )}
                  </div>

                  <span>
                    <strong>{store.name}</strong>

                    {location ? (
                      <small>
                        <MapPin size={13} />
                        {location}
                      </small>
                    ) : null}
                  </span>
                </div>

                {store.description ? (
                  <p>{store.description}</p>
                ) : null}

                {store.deliveryAreas?.length ? (
                  <div className="svx-product-store-row">
                    <strong>Delivery areas</strong>
                    <span>
                      {store.deliveryAreas.join(", ")}
                    </span>
                  </div>
                ) : null}

                {store.paymentMethods?.length ? (
                  <div className="svx-product-store-row">
                    <strong>Payment</strong>
                    <span>
                      {store.paymentMethods.join(", ")}
                    </span>
                  </div>
                ) : null}

                <div className="svx-product-store-actions">
                  {whatsapp ? (
                    <a
                      href={whatsapp}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Contact store
                    </a>
                  ) : null}

                  <Link
                    to={`/marketplace/${encodeURIComponent(
                      store.slug,
                    )}`}
                  >
                    View store
                  </Link>
                </div>
              </article>
            </section>

            {relatedProducts.length ? (
              <section className="svx-product-related">
                <header>
                  <div>
                    <h2>Similar products</h2>
                    <p>
                      More available products in this
                      category.
                    </p>
                  </div>

                  <Link
                    to={`/marketplace?category=${encodeURIComponent(
                      product.category || "",
                    )}`}
                  >
                    View all
                    <ChevronRight size={15} />
                  </Link>
                </header>

                <div className="svx-product-related-grid">
                  {relatedProducts.map((item) => (
                    <RelatedProduct
                      key={`${item.seller.slug}-${item.slug}`}
                      product={item}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </main>

          <MarketplaceFooter />
        </>
      )}
    </div>
  );
}
