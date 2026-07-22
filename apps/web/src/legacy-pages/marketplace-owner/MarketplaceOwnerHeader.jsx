import { NavLink } from "react-router-dom";

function navClass({ isActive }) {
  return [
    "svx-market-owner-tab",
    isActive ? "is-active" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function MarketplaceOwnerHeader({
  title = "Customer orders",
  description = "Review what customers want before confirming stock and fulfilment.",
}) {
  return (
    <header className="svx-market-owner-header">
      <div>
        <span className="svx-market-owner-eyebrow">
          Marketplace
        </span>

        <h1>{title}</h1>

        <p>{description}</p>
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
          Orders
        </NavLink>

        <NavLink
          to="/app/marketplace/analytics"
          className={navClass}
        >
          Store performance
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
