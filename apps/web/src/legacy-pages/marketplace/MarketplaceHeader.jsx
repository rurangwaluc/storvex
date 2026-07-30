import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  Heart,
  Home,
  House,
  Lamp,
  LogIn,
  Menu,
  Monitor,
  Moon,
  Package,
  Search,
  ShoppingCart,
  Store,
  Sun,
  Tag,
  UserPlus,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import toast from "react-hot-toast";

import { useTheme } from "../../hooks/useTheme";
import MarketplaceCustomerPanel from "./MarketplaceCustomerPanel";
import {
  useMarketplaceCustomerSession,
} from "./MarketplaceCustomerSession";
import {
  MARKETPLACE_CUSTOMER_PANEL_EVENT,
  useMarketplaceCustomerStore,
} from "./marketplaceCustomerStore";

import "./MarketplaceHeader.css";

const MARKETPLACE_CATEGORIES = [
  {
    label: "Electronics",
    value: "Electronics",
    description: "Phones, laptops, TVs and accessories",
    icon: Monitor,
  },
  {
    label: "Hardware",
    value: "Hardware / Quincaillerie",
    description: "Tools, building materials and fittings",
    icon: Wrench,
  },
  {
    label: "Home & kitchen",
    value: "Home & kitchen materials",
    description: "Cookware, sinks, tiles and home materials",
    icon: House,
  },
  {
    label: "Lighting",
    value: "Lighting",
    description: "Bulbs, ceiling lights and flood lights",
    icon: Lamp,
  },
  {
    label: "Spare parts",
    value: "Spare parts",
    description: "Screens, batteries, filters and parts",
    icon: Package,
  },
];

function cx(...values) {
  return values.filter(Boolean).join(" ");
}

function routeIsActive(pathname, href) {
  if (href === "/marketplace") {
    return pathname === "/marketplace";
  }

  return pathname.startsWith(href);
}

export default function MarketplaceHeader() {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const customerStore = useMarketplaceCustomerStore();
  const customerSession =
    useMarketplaceCustomerSession();

  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] =
    useState(false);
  const [searchInput, setSearchInput] =
    useState("");
  const [customerPanelOpen, setCustomerPanelOpen] =
    useState(false);
  const [customerPanelMode, setCustomerPanelMode] =
    useState("cart");

  const headerRef = useRef(null);
  const pathname = location.pathname || "";

  const accountPath = customerSession.signedIn
    ? "/marketplace/account"
    : "/marketplace/account/sign-in";

  function closeNavigation() {
    setMenuOpen(false);
    setCategoriesOpen(false);
  }

  function openCustomerPanel(mode) {
    closeNavigation();
    setCustomerPanelMode(mode);
    setCustomerPanelOpen(true);
  }

  function submitSearch(event) {
    event.preventDefault();

    const query = searchInput.trim();

    navigate(
      query
        ? `/marketplace/shop?q=${encodeURIComponent(query)}`
        : "/marketplace/shop",
    );

    closeNavigation();
  }

  function chooseCategory(value) {
    navigate(
      `/marketplace/shop?category=${encodeURIComponent(value)}`,
    );

    closeNavigation();
  }

  useEffect(() => {
    closeNavigation();
  }, [pathname]);

  useEffect(() => {
    function handlePanelRequest(event) {
      openCustomerPanel(
        event?.detail?.mode || "cart",
      );
    }

    window.addEventListener(
      MARKETPLACE_CUSTOMER_PANEL_EVENT,
      handlePanelRequest,
    );

    return () => {
      window.removeEventListener(
        MARKETPLACE_CUSTOMER_PANEL_EVENT,
        handlePanelRequest,
      );
    };
  }, []);

  useEffect(() => {
    if (!menuOpen && !categoriesOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!headerRef.current) return;

      if (
        headerRef.current.contains(event.target)
      ) {
        return;
      }

      closeNavigation();
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeNavigation();
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );
    document.addEventListener(
      "touchstart",
      handlePointerDown,
      { passive: true },
    );
    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );
      document.removeEventListener(
        "touchstart",
        handlePointerDown,
      );
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [menuOpen, categoriesOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [menuOpen]);

  return (
    <>
      <header
        ref={headerRef}
        className={cx(
          "smh",
          menuOpen && "is-menu-open",
        )}
      >
        <div className="smh__primary">
          <div className="smh__primary-inner">
            <button
              type="button"
              className="smh__mobile-menu"
              onClick={() =>
                setMenuOpen((current) => !current)
              }
              aria-label={
                menuOpen
                  ? "Close Marketplace menu"
                  : "Open Marketplace menu"
              }
              aria-expanded={menuOpen}
              aria-controls="storvex-marketplace-menu"
            >
              {menuOpen ? (
                <X
                  size={23}
                  strokeWidth={2.1}
                  aria-hidden="true"
                />
              ) : (
                <Menu
                  size={23}
                  strokeWidth={2.1}
                  aria-hidden="true"
                />
              )}
            </button>

            <Link
              to="/marketplace"
              className="smh__brand"
              aria-label="Storvex Marketplace home"
              onClick={closeNavigation}
            >
              <img
                src="/storvex_icon.webp"
                alt=""
                draggable="false"
              />

              <span>
                <strong>Storvex</strong>
                <small>Marketplace</small>
              </span>
            </Link>

            <div className="smh__categories">
              <button
                type="button"
                className="smh__categories-trigger"
                onClick={() =>
                  setCategoriesOpen(
                    (current) => !current,
                  )
                }
                aria-expanded={categoriesOpen}
              >
                <span>Categories</span>
                <ChevronDown
                  size={17}
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              </button>

              <div
                className={cx(
                  "smh__categories-menu",
                  categoriesOpen && "is-open",
                )}
              >
                {MARKETPLACE_CATEGORIES.map(
                  (category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() =>
                        chooseCategory(
                          category.value,
                        )
                      }
                    >
                      {category.label}
                    </button>
                  ),
                )}

                <Link
                  to="/marketplace/shop"
                  onClick={closeNavigation}
                >
                  View all products
                </Link>
              </div>
            </div>

            <form
              className="smh__search"
              onSubmit={submitSearch}
            >
              <Search
                size={19}
                strokeWidth={2.1}
                aria-hidden="true"
              />

              <input
                type="search"
                value={searchInput}
                onChange={(event) =>
                  setSearchInput(
                    event.target.value,
                  )
                }
                placeholder="Search products or stores"
                aria-label="Search products or stores"
              />

              <button type="submit">
                Search
              </button>
            </form>

            <div className="smh__actions">
              <button
                type="button"
                className="smh__theme"
                onClick={toggleTheme}
                aria-label={
                  isDark
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                aria-pressed={isDark}
              >
                {isDark ? (
                  <Sun
                    size={20}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                ) : (
                  <Moon
                    size={20}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                )}
              </button>

              <Link
                to={accountPath}
                className="smh__action smh__account"
                onClick={closeNavigation}
              >
                <UserRound
                  size={20}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span>
                  {customerSession.signedIn
                    ? "Account"
                    : "Sign in"}
                </span>
              </Link>

              <button
                type="button"
                className="smh__action"
                onClick={() =>
                  openCustomerPanel("wishlist")
                }
                aria-label={`Saved products: ${customerStore.wishlist.length}`}
              >
                <Heart
                  size={21}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span>Saved</span>

                {customerStore.wishlist.length ? (
                  <b>
                    {customerStore.wishlist.length}
                  </b>
                ) : null}
              </button>

              <button
                type="button"
                className="smh__action smh__cart"
                onClick={() =>
                  openCustomerPanel("cart")
                }
                aria-label={`Cart: ${customerStore.cartCount} items`}
              >
                <ShoppingCart
                  size={21}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span>Cart</span>

                {customerStore.cartCount ? (
                  <b>
                    {customerStore.cartCount}
                  </b>
                ) : null}
              </button>

              <Link
                to="/signup"
                className="smh__sell"
                onClick={closeNavigation}
              >
                Sell on Storvex
              </Link>
            </div>
          </div>

          <form
            className="smh__mobile-search"
            onSubmit={submitSearch}
          >
            <Search
              size={19}
              strokeWidth={2.1}
              aria-hidden="true"
            />

            <input
              type="search"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              placeholder="Search products or stores"
              aria-label="Search products or stores"
            />

            <button type="submit">
              Search
            </button>
          </form>
        </div>

        <div className="smh__secondary">
          <nav
            className="smh__secondary-inner"
            aria-label="Marketplace navigation"
          >
            {[
              {
                label: "Home",
                href: "/marketplace",
              },
              {
                label: "Shop",
                href: "/marketplace/shop",
              },
              {
                label: "Stores",
                href: "/marketplace/stores",
              },
            ].map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={
                  routeIsActive(
                    pathname,
                    item.href,
                  )
                    ? "is-active"
                    : ""
                }
              >
                {item.label}
              </Link>
            ))}

            <Link
              to="/marketplace/shop?onSale=true"
            >
              Deals
            </Link>

            <Link
              to="/"
              className="smh__business-link"
            >
              Storvex for businesses
            </Link>
          </nav>
        </div>

        <div
          id="storvex-marketplace-menu"
          className="smh__drawer"
          aria-hidden={!menuOpen}
        >
          <button
            type="button"
            className="smh__drawer-backdrop"
            aria-label="Close Marketplace menu"
            onClick={closeNavigation}
          />

          <nav
            className="smh__drawer-panel smh-menu"
            aria-label="Marketplace mobile navigation"
          >
            <div className="smh-menu__header">
              <Link
                to="/marketplace"
                className="smh-menu__brand"
                onClick={closeNavigation}
              >
                <span className="smh-menu__brand-mark">
                  <img
                    src="/storvex_icon.webp"
                    alt=""
                    aria-hidden="true"
                  />
                </span>

                <span className="smh-menu__brand-copy">
                  <strong>Marketplace</strong>
                  <small>Shop products from local stores</small>
                </span>
              </Link>

              <button
                type="button"
                className="smh-menu__close"
                onClick={closeNavigation}
                aria-label="Close Marketplace menu"
              >
                <X
                  size={22}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="smh-menu__body">
              <section
                className="smh-menu__account"
                aria-labelledby="marketplace-account-heading"
              >
                <div className="smh-menu__account-icon">
                  <UserRound
                    size={22}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </div>

                <div className="smh-menu__account-copy">
                  <span id="marketplace-account-heading">
                    {customerSession.signedIn
                      ? "Your Marketplace account"
                      : "Your customer account"}
                  </span>

                  <strong>
                    {customerSession.signedIn
                      ? "Orders, saved products and account details"
                      : "Sign in to track orders and save products"}
                  </strong>
                </div>

                {customerSession.signedIn ? (
                  <Link
                    to="/marketplace/account"
                    className="smh-menu__account-primary"
                    onClick={closeNavigation}
                  >
                    View account
                    <ChevronRight
                      size={18}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </Link>
                ) : (
                  <div className="smh-menu__account-actions">
                    <Link
                      to="/marketplace/account/sign-in"
                      className="smh-menu__account-primary"
                      onClick={closeNavigation}
                    >
                      <LogIn
                        size={18}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      Sign in
                    </Link>

                    <Link
                      to="/marketplace/account/create"
                      className="smh-menu__account-secondary"
                      onClick={closeNavigation}
                    >
                      <UserPlus
                        size={18}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      Create account
                    </Link>
                  </div>
                )}
              </section>

              <section
                className="smh-menu__section"
                aria-labelledby="marketplace-navigation-heading"
              >
                <h2 id="marketplace-navigation-heading">
                  Marketplace
                </h2>

                <div className="smh-menu__navigation">
                  <Link
                    to="/marketplace"
                    className={cx(
                      "smh-menu__navigation-row",
                      pathname === "/marketplace" &&
                        "is-active",
                    )}
                    onClick={closeNavigation}
                  >
                    <span className="smh-menu__row-icon">
                      <Home
                        size={21}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </span>

                    <span className="smh-menu__row-copy">
                      <strong>Home</strong>
                      <small>
                        Marketplace overview and new arrivals
                      </small>
                    </span>

                    <ChevronRight
                      className="smh-menu__row-arrow"
                      size={19}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </Link>

                  <Link
                    to="/marketplace/shop"
                    className={cx(
                      "smh-menu__navigation-row",
                      pathname.startsWith(
                        "/marketplace/shop",
                      ) && "is-active",
                    )}
                    onClick={closeNavigation}
                  >
                    <span className="smh-menu__row-icon">
                      <Search
                        size={21}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </span>

                    <span className="smh-menu__row-copy">
                      <strong>Browse products</strong>
                      <small>
                        Search products currently available
                      </small>
                    </span>

                    <ChevronRight
                      className="smh-menu__row-arrow"
                      size={19}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </Link>

                  <Link
                    to="/marketplace/stores"
                    className={cx(
                      "smh-menu__navigation-row",
                      pathname.startsWith(
                        "/marketplace/stores",
                      ) && "is-active",
                    )}
                    onClick={closeNavigation}
                  >
                    <span className="smh-menu__row-icon">
                      <Store
                        size={21}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </span>

                    <span className="smh-menu__row-copy">
                      <strong>Explore stores</strong>
                      <small>
                        Find local sellers using Storvex
                      </small>
                    </span>

                    <ChevronRight
                      className="smh-menu__row-arrow"
                      size={19}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </Link>

                  <Link
                    to="/marketplace/shop?onSale=true"
                    className="smh-menu__navigation-row"
                    onClick={closeNavigation}
                  >
                    <span className="smh-menu__row-icon">
                      <Tag
                        size={21}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </span>

                    <span className="smh-menu__row-copy">
                      <strong>Deals</strong>
                      <small>
                        Products currently offered at a lower price
                      </small>
                    </span>

                    <ChevronRight
                      className="smh-menu__row-arrow"
                      size={19}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              </section>

              <section
                className="smh-menu__section"
                aria-labelledby="marketplace-shopping-heading"
              >
                <h2 id="marketplace-shopping-heading">
                  Your shopping
                </h2>

                <div className="smh-menu__shopping-grid">
                  <button
                    type="button"
                    className="smh-menu__shopping-tile"
                    onClick={() =>
                      openCustomerPanel("wishlist")
                    }
                  >
                    <span className="smh-menu__shopping-icon">
                      <Heart
                        size={20}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </span>

                    <span>
                      <strong>Saved</strong>
                      <small>Products to revisit</small>
                    </span>

                    <b>{customerStore.wishlist.length}</b>
                  </button>

                  <button
                    type="button"
                    className="smh-menu__shopping-tile"
                    onClick={() =>
                      openCustomerPanel("compare")
                    }
                  >
                    <span className="smh-menu__shopping-icon">
                      <ArrowLeftRight
                        size={20}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </span>

                    <span>
                      <strong>Compare</strong>
                      <small>Products side by side</small>
                    </span>

                    <b>{customerStore.compare.length}</b>
                  </button>

                  <button
                    type="button"
                    className="smh-menu__shopping-tile smh-menu__shopping-tile--cart"
                    onClick={() =>
                      openCustomerPanel("cart")
                    }
                  >
                    <span className="smh-menu__shopping-icon">
                      <ShoppingCart
                        size={20}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </span>

                    <span>
                      <strong>Cart</strong>
                      <small>
                        Review products before requesting them
                      </small>
                    </span>

                    <b>{customerStore.cartCount}</b>

                    <ChevronRight
                      size={19}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </section>

              <section
                className="smh-menu__section"
                aria-labelledby="marketplace-categories-heading"
              >
                <div className="smh-menu__section-heading">
                  <h2 id="marketplace-categories-heading">
                    Categories
                  </h2>

                  <Link
                    to="/marketplace/shop"
                    onClick={closeNavigation}
                  >
                    View all
                  </Link>
                </div>

                <div className="smh-menu__categories">
                  {MARKETPLACE_CATEGORIES.map(
                    (category) => {
                      const CategoryIcon = category.icon;

                      return (
                        <button
                          key={category.value}
                          type="button"
                          className="smh-menu__category-row"
                          onClick={() =>
                            chooseCategory(category.value)
                          }
                        >
                          <span className="smh-menu__category-icon">
                            <CategoryIcon
                              size={20}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          </span>

                          <span className="smh-menu__category-copy">
                            <strong>{category.label}</strong>
                            <small>
                              {category.description}
                            </small>
                          </span>

                          <ChevronRight
                            size={18}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    },
                  )}
                </div>
              </section>

              <section className="smh-menu__seller">
                <span className="smh-menu__seller-icon">
                  <BriefcaseBusiness
                    size={22}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>

                <div className="smh-menu__seller-copy">
                  <span>Sell with Storvex</span>

                  <strong>
                    Put your available products in front of
                    local customers.
                  </strong>

                  <p>
                    Manage stock in Storvex and confirm every
                    customer request before it becomes a sale.
                  </p>
                </div>

                <Link
                  to="/signup"
                  className="smh-menu__seller-action"
                  onClick={closeNavigation}
                >
                  Start selling
                  <ChevronRight
                    size={18}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </Link>
              </section>

              <section
                className="smh-menu__business-links"
                aria-label="Storvex business links"
              >
                <Link
                  to="/"
                  onClick={closeNavigation}
                >
                  <span>
                    <strong>Storvex for businesses</strong>
                    <small>
                      Learn how Storvex helps stores operate
                    </small>
                  </span>

                  <ChevronRight
                    size={18}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </Link>

                <Link
                  to="/login"
                  onClick={closeNavigation}
                >
                  <span>
                    <strong>Owner access</strong>
                    <small>
                      Sign in to manage your business
                    </small>
                  </span>

                  <ChevronRight
                    size={18}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </Link>
              </section>

              <section className="smh-menu__appearance">
                <div>
                  {isDark ? (
                    <Moon
                      size={19}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  ) : (
                    <Sun
                      size={19}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  )}

                  <span>
                    <strong>Appearance</strong>
                    <small>
                      {isDark ? "Dark mode" : "Light mode"}
                    </small>
                  </span>
                </div>

                <button
                  type="button"
                  className={cx(
                    "smh-menu__theme-switch",
                    isDark && "is-dark",
                  )}
                  onClick={toggleTheme}
                  aria-label={
                    isDark
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
                  aria-pressed={isDark}
                >
                  <span />
                </button>
              </section>
            </div>
          </nav>
        </div>
      </header>

      <MarketplaceCustomerPanel
        open={customerPanelOpen}
        mode={customerPanelMode}
        store={customerStore}
        onClose={() =>
          setCustomerPanelOpen(false)
        }
        onModeChange={setCustomerPanelMode}
        notify={(message) =>
          toast.success(message)
        }
      />
    </>
  );
}
