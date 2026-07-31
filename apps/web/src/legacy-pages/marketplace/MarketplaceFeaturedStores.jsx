import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import {
  Link,
} from "react-router-dom";

import {
  listMarketplaceProducts,
  listMarketplaceStores,
} from "../../services/marketplaceApi";

import "./MarketplaceFeaturedStores.css";

const STORE_LIMIT = 8;
const PRODUCT_LIMIT = 4;
const AUTOPLAY_DELAY = 7000;

function cleanString(value) {
  return String(value || "").trim();
}

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

function imageSource(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return cleanString(value);
  }

  return cleanString(
    value.url ||
      value.thumbnailUrl ||
      value.publicUrl ||
      value.imageUrl ||
      value.src,
  );
}

function storeLocation(store) {
  const exactAddress = cleanString(
    store?.location?.address,
  );

  if (exactAddress) {
    return exactAddress;
  }

  return [
    cleanString(store?.location?.sector),
    cleanString(store?.location?.district),
  ]
    .filter(Boolean)
    .filter(
      (value, index, values) =>
        values.indexOf(value) === index,
    )
    .join(", ");
}

function storeUrl(store) {
  return `/marketplace/stores/${encodeURIComponent(
    store.slug,
  )}`;
}

function productUrl(product) {
  const storeSlug = cleanString(
    product?.seller?.slug,
  );

  const productSlug = cleanString(
    product?.slug,
  );

  if (!storeSlug || !productSlug) {
    return "";
  }

  return `/marketplace/${encodeURIComponent(
    storeSlug,
  )}/${encodeURIComponent(productSlug)}`;
}

function FeaturedStoreSkeleton() {
  return (
    <section
      className="svx-featured-store is-loading"
      aria-label="Loading featured store"
    >
      <div className="svx-featured-store__skeleton-brand">
        <i />

        <span>
          <b />
          <small />
        </span>
      </div>

      <div className="svx-featured-store__skeleton-products">
        <strong />
        <div>
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>

      <div className="svx-featured-store__skeleton-info">
        <i />
        <i />
        <i />
      </div>
    </section>
  );
}

export default function MarketplaceFeaturedStores() {
  const sectionRef = useRef(null);
  const touchStartRef = useRef(null);

  const [slides, setSlides] =
    useState([]);

  const [activeIndex, setActiveIndex] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [paused, setPaused] =
    useState(false);

  const [
    reducedMotion,
    setReducedMotion,
  ] = useState(false);

  const [
    slideDirection,
    setSlideDirection,
  ] = useState("next");

  const loadFeaturedStores =
    useCallback(async () => {
      setLoading(true);

      try {
        const storeResponse =
          await listMarketplaceStores({
            sort: "products",
            page: 1,
            limit: STORE_LIMIT,
          });

        const stores =
          Array.isArray(storeResponse?.stores)
            ? storeResponse.stores
            : [];

        const nextSlides =
          await Promise.all(
            stores.map(async (store) => {
              try {
                const productResponse =
                  await listMarketplaceProducts({
                    store: store.slug,
                    sort: "newest",
                    page: 1,
                    limit: PRODUCT_LIMIT,
                  });

                return {
                  store,
                  products:
                    Array.isArray(
                      productResponse?.products,
                    )
                      ? productResponse.products
                      : [],
                };
              } catch {
                return {
                  store,
                  products: [],
                };
              }
            }),
          );

        setSlides(
          nextSlides.filter(
            (slide) =>
              slide.store &&
              slide.products.length > 0,
          ),
        );

        setActiveIndex(0);
      } catch {
        setSlides([]);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadFeaturedStores();
  }, [loadFeaturedStores]);

  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    function updatePreference() {
      setReducedMotion(media.matches);
    }

    updatePreference();

    media.addEventListener?.(
      "change",
      updatePreference,
    );

    return () => {
      media.removeEventListener?.(
        "change",
        updatePreference,
      );
    };
  }, []);

  const activeSlide =
    slides[activeIndex] || null;

  const hasMultipleStores =
    slides.length > 1;

  const moveTo = useCallback(
    (index, direction = "next") => {
      if (!slides.length) return;

      setSlideDirection(direction);

      setActiveIndex(
        (index + slides.length) %
          slides.length,
      );
    },
    [slides.length],
  );

  const showPrevious =
    useCallback(() => {
      moveTo(
        activeIndex - 1,
        "previous",
      );
    }, [
      activeIndex,
      moveTo,
    ]);

  const showNext =
    useCallback(() => {
      moveTo(
        activeIndex + 1,
        "next",
      );
    }, [
      activeIndex,
      moveTo,
    ]);

  useEffect(() => {
    if (
      !hasMultipleStores ||
      paused ||
      reducedMotion
    ) {
      return undefined;
    }

    const timer = window.setTimeout(
      showNext,
      AUTOPLAY_DELAY,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activeIndex,
    hasMultipleStores,
    paused,
    reducedMotion,
    showNext,
  ]);

  const location = useMemo(
    () =>
      activeSlide
        ? storeLocation(
            activeSlide.store,
          )
        : "",
    [activeSlide],
  );

  function handleTouchStart(event) {
    touchStartRef.current =
      event.touches?.[0]?.clientX ??
      null;
  }

  function handleTouchEnd(event) {
    if (
      touchStartRef.current === null
    ) {
      return;
    }

    const endX =
      event.changedTouches?.[0]
        ?.clientX ??
      touchStartRef.current;

    const distance =
      endX - touchStartRef.current;

    touchStartRef.current = null;

    if (Math.abs(distance) < 45) {
      return;
    }

    if (distance > 0) {
      showPrevious();
    } else {
      showNext();
    }
  }

  if (loading) {
    return <FeaturedStoreSkeleton />;
  }

  if (!activeSlide) {
    return null;
  }

  const {
    store,
    products,
  } = activeSlide;

  const visibleProducts =
    products.slice(0, PRODUCT_LIMIT);

  return (
    <section
      ref={sectionRef}
      className="svx-featured-store"
      aria-label={`Featured store: ${store.name}`}
      aria-roledescription="carousel"
      onMouseEnter={() =>
        setPaused(true)
      }
      onMouseLeave={() =>
        setPaused(false)
      }
      onFocusCapture={() =>
        setPaused(true)
      }
      onBlurCapture={(event) => {
        if (
          !event.currentTarget.contains(
            event.relatedTarget,
          )
        ) {
          setPaused(false);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Link
        to={storeUrl(store)}
        className="svx-featured-store__click-area"
        aria-label={`Visit ${store.name}`}
      />

      <div
        key={`identity-${store.slug}-${activeIndex}`}
        className={cx(
          "svx-featured-store__identity",
          "svx-featured-store__slide-panel",
          `is-${slideDirection}`,
        )}
      >
        <span className="svx-featured-store__label">
          Featured store
        </span>

        <div className="svx-featured-store__brand">
          <div className="svx-featured-store__logo">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={`${store.name} logo`}
              />
            ) : (
              <Store
                size={32}
                aria-hidden="true"
              />
            )}
          </div>

          <div className="svx-featured-store__name">
            <h2>{store.name}</h2>
          </div>
        </div>

        <div className="svx-featured-store__facts">
          {location ? (
            <span>
              <MapPin
                size={14}
                aria-hidden="true"
              />

              {location}
            </span>
          ) : null}

          <span>
            <PackageCheck
              size={14}
              aria-hidden="true"
            />

            {Number(
              store.availableProductCount ||
                products.length,
            ).toLocaleString()}{" "}
            products
          </span>
        </div>
      </div>

      <div
        key={`products-${store.slug}-${activeIndex}`}
        className={cx(
          "svx-featured-store__products-area",
          "svx-featured-store__slide-panel",
          `is-${slideDirection}`,
        )}
      >
        <span className="svx-featured-store__products-title">
          Latest products
        </span>

        <div className="svx-featured-store__products">
          {visibleProducts.map(
            (product) => {
              const image =
                imageSource(
                  product.image ||
                    product.images?.[0],
                );

              const url = productUrl(product);

              if (!url) {
                return null;
              }

              return (
                <Link
                  key={`${product.seller.slug}-${product.slug}`}
                  to={url}
                  className="svx-featured-store__product"
                  aria-label={`View ${product.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  onTouchStart={(event) => {
                    event.stopPropagation();
                  }}
                  onTouchEnd={(event) => {
                    event.stopPropagation();
                  }}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={product.title}
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <ShoppingBag
                      size={26}
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            },
          )}
        </div>
      </div>

      <aside
        key={`info-${store.slug}-${activeIndex}`}
        className={cx(
          "svx-featured-store__info",
          "svx-featured-store__slide-panel",
          `is-${slideDirection}`,
        )}
      >
        <span className="svx-featured-store__info-label">
          Store information
        </span>

        <div className="svx-featured-store__info-list">
          <span>
            <Store
              size={17}
              aria-hidden="true"
            />

            <strong>
              {store.temporarilyClosed
                ? "Temporarily closed"
                : "Accepting requests"}
            </strong>
          </span>

          {store.pickupEnabled ? (
            <span>
              <ShoppingBag
                size={17}
                aria-hidden="true"
              />

              <strong>
                Pickup available
              </strong>
            </span>
          ) : null}

          {store.deliveryEnabled ? (
            <span>
              <Truck
                size={17}
                aria-hidden="true"
              />

              <strong>
                Delivery available
              </strong>
            </span>
          ) : null}
        </div>
      </aside>

      {hasMultipleStores ? (
        <div className="svx-featured-store__controls">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              showPrevious();
            }}
            aria-label="Previous featured store"
          >
            <ArrowLeft
              size={16}
              aria-hidden="true"
            />
          </button>

          <div className="svx-featured-store__dots">
            {slides.map(
              (slide, index) => (
                <button
                  type="button"
                  key={slide.store.slug}
                  className={cx(
                    index === activeIndex &&
                      "is-active",
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    moveTo(
                      index,
                      index > activeIndex
                        ? "next"
                        : "previous",
                    );
                  }}
                  aria-label={`Show ${slide.store.name}`}
                  aria-current={
                    index === activeIndex
                      ? "true"
                      : undefined
                  }
                />
              ),
            )}
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              showNext();
            }}
            aria-label="Next featured store"
          >
            <ArrowRight
              size={16}
              aria-hidden="true"
            />
          </button>
        </div>
      ) : null}

      {hasMultipleStores ? (
        <div className="svx-featured-store__progress">
          <span
            key={activeIndex}
            className={cx(
              !paused &&
                !reducedMotion &&
                "is-running",
            )}
          />
        </div>
      ) : null}
    </section>
  );
}
