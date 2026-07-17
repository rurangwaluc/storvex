import { useCallback, useEffect, useMemo, useState } from "react";

export const MARKETPLACE_CUSTOMER_EVENT =
  "storvex:marketplace-customer-state";

export const MARKETPLACE_CUSTOMER_PANEL_EVENT =
  "storvex:marketplace-open-customer-panel";

export function openMarketplaceCustomerPanel(
  mode = "cart",
) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(
      MARKETPLACE_CUSTOMER_PANEL_EVENT,
      {
        detail: {
          mode,
        },
      },
    ),
  );
}

export const MARKETPLACE_CUSTOMER_STORAGE =
  "storvex-marketplace-customer-v1";

const EMPTY_STATE = {
  cart: [],
  wishlist: [],
  compare: [],
};

function cleanString(value) {
  return String(value || "").trim();
}

function positiveInteger(value, fallback = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return Math.max(1, Math.floor(number));
}

export function marketplaceProductKey(product) {
  return [
    cleanString(product?.seller?.slug),
    cleanString(product?.slug),
  ]
    .filter(Boolean)
    .join(":");
}

export function marketplaceProductSnapshot(product) {
  const images =
    Array.isArray(product?.images) && product.images.length
      ? product.images
      : product?.image
        ? [product.image]
        : [];

  return {
    key: marketplaceProductKey(product),
    slug: cleanString(product?.slug),
    title: cleanString(product?.title),
    description: cleanString(product?.description),
    category: cleanString(product?.category),
    comparisonCategory: cleanString(
      product?.comparisonCategory ||
      product?.attributes?.businessCategory ||
      product?.businessCategory ||
      product?.category,
    ),
    attributes:
      product?.attributes &&
      typeof product.attributes === "object" &&
      !Array.isArray(product.attributes)
        ? { ...product.attributes }
        : {},
    currency: cleanString(product?.currency) || "RWF",
    price: Math.max(0, Number(product?.price || 0)),
    regularPrice: Math.max(
      0,
      Number(product?.regularPrice ?? product?.price ?? 0),
    ),
    salePrice:
      product?.salePrice === null ||
      product?.salePrice === undefined
        ? null
        : Math.max(0, Number(product.salePrice || 0)),
    onSale: Boolean(product?.onSale),
    availableQuantity: Math.max(
      0,
      Number(product?.availableQuantity || 0),
    ),
    pickupEnabled: Boolean(product?.pickupEnabled),
    deliveryEnabled: Boolean(product?.deliveryEnabled),
    seller: {
      slug: cleanString(product?.seller?.slug),
      name: cleanString(product?.seller?.name),
      temporarilyClosed: Boolean(
        product?.seller?.temporarilyClosed,
      ),
    },
    image: images[0] || product?.image || null,
    images: images.slice(0, 4),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeItem(item) {
  if (!item || typeof item !== "object") return null;

  const key = cleanString(item.key);

  if (!key) return null;

  return {
    ...item,
    key,
    quantity: positiveInteger(item.quantity, 1),
    availableQuantity: Math.max(
      0,
      Number(item.availableQuantity || 0),
    ),
  };
}

function normalizeState(value) {
  const source =
    value && typeof value === "object"
      ? value
      : EMPTY_STATE;

  const cart = Array.isArray(source.cart)
    ? source.cart.map(normalizeItem).filter(Boolean)
    : [];

  const wishlist = Array.isArray(source.wishlist)
    ? source.wishlist.map(normalizeItem).filter(Boolean)
    : [];

  const compare = Array.isArray(source.compare)
    ? source.compare.map(normalizeItem).filter(Boolean)
    : [];

  return {
    cart,
    wishlist,
    compare,
  };
}

export function readMarketplaceCustomerState() {
  if (typeof window === "undefined") {
    return EMPTY_STATE;
  }

  try {
    return normalizeState(
      JSON.parse(
        window.localStorage.getItem(
          MARKETPLACE_CUSTOMER_STORAGE,
        ) || "{}",
      ),
    );
  } catch {
    return EMPTY_STATE;
  }
}

export function removeMarketplaceCartKeys(keys = []) {
  const keySet = new Set(
    Array.isArray(keys)
      ? keys.map(cleanString).filter(Boolean)
      : [],
  );

  if (!keySet.size) return;

  const current =
    readMarketplaceCustomerState();

  writeMarketplaceCustomerState({
    ...current,
    cart: current.cart.filter(
      (item) => !keySet.has(item.key),
    ),
  });
}

export function writeMarketplaceCustomerState(nextState) {
  if (typeof window === "undefined") return;

  const normalized = normalizeState(nextState);

  window.localStorage.setItem(
    MARKETPLACE_CUSTOMER_STORAGE,
    JSON.stringify(normalized),
  );

  window.dispatchEvent(
    new CustomEvent(MARKETPLACE_CUSTOMER_EVENT, {
      detail: normalized,
    }),
  );
}

function replaceByKey(items, nextItem) {
  const exists = items.some(
    (item) => item.key === nextItem.key,
  );

  if (!exists) {
    return [...items, nextItem];
  }

  return items.map((item) =>
    item.key === nextItem.key
      ? {
          ...item,
          ...nextItem,
          quantity: item.quantity || nextItem.quantity || 1,
        }
      : item,
  );
}

export function syncMarketplaceProductSnapshots(products) {
  if (!Array.isArray(products) || !products.length) return;

  const snapshots = new Map(
    products
      .map(marketplaceProductSnapshot)
      .filter((item) => item.key)
      .map((item) => [item.key, item]),
  );

  const current = readMarketplaceCustomerState();

  function syncItems(items) {
    return items.map((item) => {
      const snapshot = snapshots.get(item.key);

      if (!snapshot) return item;

      return {
        ...item,
        ...snapshot,
        quantity: Math.min(
          positiveInteger(item.quantity, 1),
          Math.max(1, snapshot.availableQuantity),
        ),
      };
    });
  }

  writeMarketplaceCustomerState({
    cart: syncItems(current.cart),
    wishlist: syncItems(current.wishlist),
    compare: syncItems(current.compare),
  });
}

export function useMarketplaceCustomerStore() {
  const [state, setState] = useState(() =>
    readMarketplaceCustomerState(),
  );

  useEffect(() => {
    function sync(event) {
      if (
        event?.type === MARKETPLACE_CUSTOMER_EVENT &&
        event?.detail
      ) {
        setState(normalizeState(event.detail));
        return;
      }

      if (
        event?.type === "storage" &&
        event?.key !== MARKETPLACE_CUSTOMER_STORAGE
      ) {
        return;
      }

      setState(readMarketplaceCustomerState());
    }

    window.addEventListener(
      MARKETPLACE_CUSTOMER_EVENT,
      sync,
    );
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(
        MARKETPLACE_CUSTOMER_EVENT,
        sync,
      );
      window.removeEventListener("storage", sync);
    };
  }, []);

  const commit = useCallback((updater) => {
    const current = readMarketplaceCustomerState();
    const next =
      typeof updater === "function"
        ? updater(current)
        : updater;

    writeMarketplaceCustomerState(next);
  }, []);

  const addToCart = useCallback(
    (product, quantity = 1) => {
      const snapshot =
        marketplaceProductSnapshot(product);

      if (
        !snapshot.key ||
        snapshot.availableQuantity <= 0 ||
        snapshot.seller.temporarilyClosed
      ) {
        return {
          ok: false,
          reason: snapshot.seller.temporarilyClosed
            ? "STORE_CLOSED"
            : "UNAVAILABLE",
          quantity: 0,
          addedQuantity: 0,
        };
      }

      const current =
        readMarketplaceCustomerState();

      const existing = current.cart.find(
        (item) => item.key === snapshot.key,
      );

      const currentQuantity = Math.max(
        0,
        Number(existing?.quantity || 0),
      );

      if (
        currentQuantity >=
        snapshot.availableQuantity
      ) {
        return {
          ok: false,
          reason: "STOCK_LIMIT",
          quantity: currentQuantity,
          addedQuantity: 0,
          availableQuantity:
            snapshot.availableQuantity,
        };
      }

      const requestedQuantity =
        positiveInteger(quantity, 1);

      const nextQuantity = Math.min(
        snapshot.availableQuantity,
        currentQuantity + requestedQuantity,
      );

      const addedQuantity =
        nextQuantity - currentQuantity;

      commit((latest) => ({
        ...latest,
        cart: replaceByKey(latest.cart, {
          ...snapshot,
          quantity: nextQuantity,
        }),
      }));

      return {
        ok: true,
        reason: null,
        quantity: nextQuantity,
        addedQuantity,
        availableQuantity:
          snapshot.availableQuantity,
        limited:
          addedQuantity < requestedQuantity,
      };
    },
    [commit],
  );

  const removeFromCart = useCallback(
    (key) => {
      commit((current) => ({
        ...current,
        cart: current.cart.filter(
          (item) => item.key !== key,
        ),
      }));
    },
    [commit],
  );

  const updateCartQuantity = useCallback(
    (key, quantity) => {
      commit((current) => ({
        ...current,
        cart: current.cart
          .map((item) => {
            if (item.key !== key) return item;

            const maximum = Math.max(
              1,
              Number(item.availableQuantity || 1),
            );

            return {
              ...item,
              quantity: Math.min(
                maximum,
                positiveInteger(quantity, 1),
              ),
            };
          })
          .filter(Boolean),
      }));
    },
    [commit],
  );

  const toggleWishlist = useCallback(
    (product) => {
      const snapshot =
        marketplaceProductSnapshot(product);

      const exists = state.wishlist.some(
        (item) => item.key === snapshot.key,
      );

      commit((current) => ({
        ...current,
        wishlist: exists
          ? current.wishlist.filter(
              (item) => item.key !== snapshot.key,
            )
          : [
              ...current.wishlist,
              {
                ...snapshot,
                quantity: 1,
              },
            ],
      }));

      return !exists;
    },
    [commit, state.wishlist],
  );

  const removeFromWishlist = useCallback(
    (key) => {
      commit((current) => ({
        ...current,
        wishlist: current.wishlist.filter(
          (item) => item.key !== key,
        ),
      }));
    },
    [commit],
  );

  const toggleCompare = useCallback(
    (product) => {
      const snapshot =
        marketplaceProductSnapshot(product);

      const exists = state.compare.some(
        (item) => item.key === snapshot.key,
      );

      if (exists) {
        commit((current) => ({
          ...current,
          compare: current.compare.filter(
            (item) => item.key !== snapshot.key,
          ),
        }));

        return {
          active: false,
          reason: null,
        };
      }

      if (state.compare.length >= 4) {
        return {
          active: false,
          reason: "LIMIT",
        };
      }

      const activeCategory = cleanString(
        state.compare[0]?.comparisonCategory ||
        state.compare[0]?.category,
      )
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_");

      const nextCategory = cleanString(
        snapshot.comparisonCategory ||
        snapshot.category,
      )
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_");

      if (
        activeCategory &&
        nextCategory &&
        activeCategory !== nextCategory
      ) {
        return {
          active: false,
          reason: "CATEGORY",
        };
      }

      commit((current) => ({
        ...current,
        compare: [
          ...current.compare,
          {
            ...snapshot,
            quantity: 1,
          },
        ],
      }));

      return {
        active: true,
        reason: null,
      };
    },
    [commit, state.compare],
  );

  const removeFromCompare = useCallback(
    (key) => {
      commit((current) => ({
        ...current,
        compare: current.compare.filter(
          (item) => item.key !== key,
        ),
      }));
    },
    [commit],
  );

  const clearCart = useCallback(() => {
    commit((current) => ({
      ...current,
      cart: [],
    }));
  }, [commit]);

  const cartCount = useMemo(
    () =>
      state.cart.reduce(
        (total, item) =>
          total + positiveInteger(item.quantity, 1),
        0,
      ),
    [state.cart],
  );

  const cartSubtotal = useMemo(
    () =>
      state.cart.reduce(
        (total, item) =>
          total +
          Math.max(0, Number(item.price || 0)) *
            positiveInteger(item.quantity, 1),
        0,
      ),
    [state.cart],
  );

  return {
    ...state,
    cartCount,
    cartSubtotal,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    toggleWishlist,
    removeFromWishlist,
    toggleCompare,
    removeFromCompare,
    clearCart,
    isInCart(key) {
      return state.cart.some(
        (item) => item.key === key,
      );
    },
    isInWishlist(key) {
      return state.wishlist.some(
        (item) => item.key === key,
      );
    },
    isInCompare(key) {
      return state.compare.some(
        (item) => item.key === key,
      );
    },
  };
}
