import { NavLink } from "react-router-dom";

function navClass({ isActive }) {
  return [
    "svx-market-owner-tab",
    isActive ? "is-active" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function MarketplaceOwnerHeader() {
  return (
    <header className="svx-market-owner-header">
      <div>
        <span className="svx-market-owner-eyebrow">
          Marketplace
        </span>

        <h1>Customer orders</h1>

        <p>
          Review what customers want before
          confirming stock and fulfilment.
        </p>
      </div>

      <nav
        className="svx-market-owner-tabs"
        aria-label="Marketplace sections"
      >
        <NavLink
          to="/app/marketplace"
          end
          className={navClass}
        >
          Requests
        </NavLink>

        <NavLink
          to="/app/inventory"
          className={navClass}
        >
          Products
        </NavLink>

        <NavLink
          to="/app/settings/marketplace"
          className={navClass}
        >
          Store settings
        </NavLink>
      </nav>
    </header>
  );
}
