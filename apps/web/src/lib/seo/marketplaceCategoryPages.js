const SITE_URL = "https://www.storvex.rw";

export const marketplaceCategoryPages = [
  {
    slug: "electronics",
    title: "Electronics for Sale in Rwanda | Storvex Marketplace",
    description: "Find phones, laptops, TVs and accessories published by shops on Storvex. Check product details before sending an order request.",
    h1: "Find electronics from shops on Storvex.",
    introduction: "Find phones, laptops, TVs and accessories that participating shops have chosen to publish. Check the listing and ask the seller to confirm availability before ordering.",
    guidance: "Compare the model, storage, memory, colour and condition when the shop has provided those details.",
    groups: ["Phones", "Laptops", "TVs", "Accessories"],
    artwork: "/marketplace/categories/electronics.webp",
  },
  {
    slug: "hardware",
    title: "Hardware and Building Materials in Rwanda | Storvex Marketplace",
    description: "Find tools, building materials, plumbing products, paint and fittings published by shops on Storvex Marketplace.",
    h1: "Find hardware and building materials from local shops.",
    introduction: "Find tools, building materials, plumbing products, paint and fittings that participating shops have published on Storvex.",
    guidance: "Compare the selling unit, size, grade and material when those details are shown in the listing.",
    groups: ["Tools", "Building materials", "Plumbing", "Paint", "Fittings"],
    artwork: "/marketplace/categories/hardware.webp",
  },
  {
    slug: "home-and-kitchen",
    title: "Home and Kitchen Products in Rwanda | Storvex Marketplace",
    description: "Find cookware, kitchen products and useful home items published by participating shops on Storvex Marketplace.",
    h1: "Find home and kitchen products from local shops.",
    introduction: "Find cookware, appliances and useful home products that participating shops have chosen to publish on Storvex.",
    guidance: "Check the size, material, colour, capacity and number of pieces when the seller has provided them.",
    groups: ["Cookware", "Appliances", "Kitchen products", "Home items"],
    artwork: "/marketplace/categories/home-kitchen.webp",
  },
  {
    slug: "lighting",
    title: "Lighting Products in Rwanda | Storvex Marketplace",
    description: "Find bulbs, ceiling lights, floodlights, outdoor lights and solar lighting published by shops on Storvex Marketplace.",
    h1: "Find lighting products from local shops.",
    introduction: "Find bulbs, ceiling lights, floodlights, outdoor lights and solar lights published by participating shops.",
    guidance: "Check wattage, voltage, fitting and light colour before sending an order request to the seller.",
    groups: ["Bulbs", "Ceiling lights", "Floodlights", "Solar lights"],
    artwork: "/marketplace/categories/lighting.webp",
  },
  {
    slug: "spare-parts",
    title: "Spare Parts in Rwanda | Storvex Marketplace",
    description: "Find vehicle, appliance, phone and computer parts published by participating shops on Storvex Marketplace.",
    h1: "Find spare parts from local shops.",
    introduction: "Find vehicle, appliance, phone and computer parts that participating shops have published on Storvex.",
    guidance: "Check the part number, make, model and year when provided. Always ask the seller to confirm compatibility before ordering.",
    groups: ["Vehicle parts", "Phone parts", "Computer parts", "Appliance parts"],
    artwork: "/marketplace/categories/spare-parts.webp",
  },
].map((page) => ({
  ...page,
  canonical: `${SITE_URL}/marketplace/category/${page.slug}`,
}));

export const marketplaceCategoryPageSlugs = marketplaceCategoryPages.map((page) => page.slug);

export function getMarketplaceCategoryPage(slug) {
  return marketplaceCategoryPages.find((page) => page.slug === slug) || null;
}
