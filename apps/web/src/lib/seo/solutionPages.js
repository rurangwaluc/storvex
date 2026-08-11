const SITE_URL = "https://www.storvex.rw";

export const solutionPages = [
  {
    slug: "inventory-management",
    title: "Inventory Management for Shops | Storvex",
    description:
      "Track products sold, new stock, damaged stock and moved stock in one place. Spend less time counting and know what to buy again.",
    eyebrow: "Inventory management",
    h1: "Know what is in stock without counting everything by hand.",
    intro:
      "Storvex keeps each stock change connected to your shop records. You can check what came in, what went out and what needs your attention.",
    accent: "blue",
    layout: "flow",
    outcomesTitle: "Check stock faster. Know what needs attention.",
    stepsTitle: "Keep stock correct as products move.",
    connectedTitle: "Your stock records help other parts of the shop.",
    timeSavedTitle: "Save the stock change once. Check it later.",
    proofLabel: "Stock activity",
    proofTitle: "Every stock change has a clear reason",
    proofRows: [
      ["Sold", "Stock goes down after a completed sale"],
      ["New stock", "Received products are added to the right branch"],
      ["Damaged", "Damaged items are recorded instead of forgotten"],
      ["Moved", "Branch transfers show where products went"],
    ],
    problemTitle: "Checking stock by hand takes too much time.",
    problemText:
      "A notebook can show what you bought, but it cannot always show what is left now. Sales, damage and branch moves can make the number wrong. Storvex brings those changes together.",
    outcomes: [
      ["Check stock faster", "Open the product list instead of counting every shelf first."],
      ["Find stock changes", "See why a number changed and which action caused it."],
      ["Plan what to buy", "Use current stock and recent sales to see what needs attention."],
    ],
    steps: [
      ["Add your products", "Save the products you sell with clear names and selling prices."],
      ["Record stock coming in", "Add new stock to the branch that received it."],
      ["Let sales update stock", "Completed sales reduce available stock through the normal sales record."],
      ["Check and fix mistakes", "Record damaged or missing items, and save why the number changed."],
    ],
    users: ["Shop owner", "Store manager", "Stock worker"],
    connected: [
      ["Sales tracking", "See which sales changed stock."],
      ["Supplier records", "Keep stock received connected to the supplier."],
      ["Business reports", "Check product changes and sales together."],
    ],
    timeSaved:
      "You still need to count stock in the shop, but you do not need to start from zero each time. Storvex gives you a clear number to check.",
    ctaTitle: "Spend less time finding your stock numbers.",
    ctaText: "Start using one clear record for products, sales and stock changes.",
    ctaLabel: "Start tracking stock",
    related: ["stock-reordering", "sales-tracking", "multi-branch-management"],
    marketplaceRelevant: true,
  },
  {
    slug: "sales-tracking",
    title: "Sales Tracking for Shops | Storvex",
    description:
      "See daily sales, products sold and branch sales without checking notebooks or waiting for worker updates. Keep every completed sale clear.",
    eyebrow: "Sales tracking",
    h1: "See what your shop sold without waiting for someone to tell you.",
    intro:
      "Each completed sale gives you a record of what was sold, when it was sold and where it was sold. Owners can check the day without calling every worker.",
    accent: "green",
    layout: "flow",
    outcomesTitle: "Check today's sales without collecting reports.",
    stepsTitle: "Record the sale once. Use it for the daily check.",
    connectedTitle: "Your sales records help with stock, cash and customers.",
    timeSavedTitle: "Record the sale once. Use it for the daily check.",
    proofLabel: "Today at a glance",
    proofTitle: "Sales records update as the shop works",
    proofRows: [
      ["Daily sales", "Check completed sales for the day"],
      ["Products sold", "See the items included in each sale"],
      ["Branch", "Know which shop branch made the sale"],
      ["Receipt", "Keep a clear record for the customer and the shop"],
    ],
    problemTitle: "Waiting for sales reports slows the owner down.",
    problemText:
      "When sales stay in separate books, the owner must ask workers, count receipts and join totals by hand. A clear sales record makes the daily check shorter.",
    outcomes: [
      ["Check the day sooner", "See recorded sales without waiting for a handwritten report."],
      ["Know what sold", "Open a sale and see the products and amounts inside it."],
      ["Compare branches", "Review sales from the right branch instead of mixing every shop together."],
    ],
    steps: [
      ["Choose the products", "The worker adds the products the customer is buying."],
      ["Record the payment", "Save how the customer paid and complete the sale."],
      ["Keep the receipt", "Storvex saves a clear sale record and receipt details."],
      ["Review the day", "The owner checks sales without collecting separate notebook totals."],
    ],
    users: ["Shop owner", "Cashier", "Branch manager"],
    connected: [
      ["Inventory management", "Completed sales help keep product stock current."],
      ["Cash control", "Compare recorded sales with money received."],
      ["Customer records", "Keep customer details with the sales that need them."],
    ],
    timeSaved:
      "Workers record the sale once. The owner can use the same record for the daily check instead of writing the same sale in more than one place.",
    ctaTitle: "Make daily sales easier to check.",
    ctaText: "Give your shop one place for sales, receipts and product records.",
    ctaLabel: "Start tracking sales",
    related: ["inventory-management", "cash-control", "staff-management"],
  },
  {
    slug: "cash-control",
    title: "Cash Control for Shops | Storvex",
    description:
      "Compare sales money, expenses, deposits and counted cash. Find cash differences faster and spend less time looking for missing money.",
    eyebrow: "Cash control",
    h1: "Know where the shop money went.",
    intro:
      "Storvex puts sales money, shop expenses, deposits and cash counts into clear records. This helps the owner check expected cash against counted cash.",
    accent: "gold",
    layout: "control",
    outcomesTitle: "Check the money without searching through books.",
    stepsTitle: "Count the cash and find any difference.",
    connectedTitle: "Your money records connect to sales and staff work.",
    timeSavedTitle: "Record each money move once. Check the cash later.",
    proofLabel: "Cash check",
    proofTitle: "See the records behind the cash total",
    proofRows: [
      ["Sales money", "Money expected from completed sales"],
      ["Expenses", "Shop money recorded as spent"],
      ["Deposits", "Money moved out of the shop drawer"],
      ["Difference", "Counted cash compared with expected cash"],
    ],
    problemTitle: "Missing money is hard to find when records are separate.",
    problemText:
      "A sales total alone does not explain expenses, deposits or cash handed over. When each movement has a record, the owner can check the difference without searching through many books.",
    outcomes: [
      ["Close the day faster", "Use recorded sales and money movements during the cash count."],
      ["Explain differences", "Check expenses, deposits and drawer actions before asking many people."],
      ["Keep better handovers", "Give the next worker a clear starting cash record."],
    ],
    steps: [
      ["Open the cash drawer", "Start with the cash amount available at the beginning."],
      ["Record money movements", "Keep sales, expenses and deposits in their correct records."],
      ["Count the cash", "Enter the money physically counted at the end of the work period."],
      ["Check the difference", "Compare counted cash with the amount Storvex expected."],
    ],
    users: ["Shop owner", "Cashier", "Store manager"],
    connected: [
      ["Sales tracking", "Use completed sales when checking expected money."],
      ["Expense records", "See what shop money was spent and why."],
      ["Staff management", "Know who opened, used or closed a drawer."],
    ],
    timeSaved:
      "The owner can start with the recorded movements instead of asking workers to remember every payment and expense at the end of the day.",
    ctaTitle: "Make the daily cash check clear.",
    ctaText: "Keep sales money, expenses and cash counts in one shop system.",
    ctaLabel: "Take control of shop cash",
    related: ["sales-tracking", "staff-management", "multi-branch-management"],
  },
  {
    slug: "multi-branch-management",
    title: "Multi-Branch Shop Management | Storvex",
    description:
      "Check branch sales, stock, workers and stock transfers from one place. Spend less time calling each branch for separate reports.",
    eyebrow: "Multi-branch management",
    h1: "See what is happening in every branch from one place.",
    intro:
      "Storvex keeps each branch clear but gives the owner one place to check them. See sales, stock and worker actions without joining many reports by hand.",
    accent: "purple",
    layout: "wide",
    outcomesTitle: "Check every branch without making more phone calls.",
    stepsTitle: "Keep each branch clear in the same business.",
    connectedTitle: "Branch records stay connected across the business.",
    timeSavedTitle: "Save branch work once. Check it from one place.",
    proofLabel: "Branch view",
    proofTitle: "Each branch stays clear inside one business",
    proofRows: [
      ["Branch sales", "Review sales from the branch that made them"],
      ["Branch stock", "Check products held at each shop location"],
      ["Workers", "Give workers access to the branch where they work"],
      ["Transfers", "Record stock moving from one branch to another"],
    ],
    problemTitle: "Separate branch reports make one business hard to see.",
    problemText:
      "Owners often call each branch, wait for photos of books and copy totals into one report. Storvex keeps branch work connected while showing where each record came from.",
    outcomes: [
      ["Make fewer update calls", "Open the branch record before asking a manager for the same numbers."],
      ["Keep branches separate", "Avoid mixing sales and stock from different locations."],
      ["Move stock clearly", "Record which branch sent stock and which branch received it."],
    ],
    steps: [
      ["Set up each branch", "Create the shop locations that belong to the business."],
      ["Give the right access", "Connect workers to the branches and tasks they need."],
      ["Record branch work", "Sales, stock and cash records stay linked to their branch."],
      ["Review from one place", "The owner checks branch results without building a new report by hand."],
    ],
    users: ["Business owner", "Branch manager", "Stock manager"],
    connected: [
      ["Sales tracking", "Review completed sales by branch."],
      ["Inventory management", "Know which branch holds each product."],
      ["Staff management", "Control branch access for each worker."],
    ],
    timeSaved:
      "Branch managers keep using Storvex during the day. The owner does not need to wait for every branch to make a separate report first.",
    ctaTitle: "Run more than one branch with fewer update calls.",
    ctaText: "Keep branch sales, stock and worker records connected.",
    ctaLabel: "Set up your branches",
    related: ["sales-tracking", "inventory-management", "staff-management"],
  },
  {
    slug: "stock-reordering",
    title: "Stock Reordering for Shops | Storvex",
    description:
      "See low stock and products that are selling fast. Spend less time checking shelves and know what may need to be bought again.",
    eyebrow: "Stock reordering",
    h1: "Know what you may need to buy again before stock runs out.",
    intro:
      "Storvex helps you find products that need attention. Check low stock together with recent sales before you decide what to buy again.",
    accent: "orange",
    layout: "flow",
    outcomesTitle: "See what is running low before shelves are empty.",
    stepsTitle: "Start with low stock. Check before you buy.",
    connectedTitle: "Stock and sales records help you decide what to buy.",
    timeSavedTitle: "Keep stock records once. Use them when buying again.",
    proofLabel: "Needs attention",
    proofTitle: "Start the buying check with a useful list",
    proofRows: [
      ["Low stock", "Products that have reached their low-stock level"],
      ["Selling fast", "Products moving through sales records"],
      ["Branch need", "The branch where stock needs attention"],
      ["Supplier", "The saved supplier record that can help with restocking"],
    ],
    problemTitle: "Shelf checks can find empty stock too late.",
    problemText:
      "A worker may only notice a missing product after a customer asks for it. A regular low-stock check helps the shop prepare before the shelf is empty.",
    outcomes: [
      ["Start with the right products", "Review low-stock items instead of checking every product first."],
      ["Check before buying", "Look at current stock and recent sales before choosing an amount."],
      ["See the branch need", "Buy for the branch that needs the product instead of mixing locations."],
    ],
    steps: [
      ["Keep stock records current", "Record received stock, sales, damage and branch moves."],
      ["Open the reorder view", "See products that have reached their attention level."],
      ["Check recent sales", "Check whether the product is selling before choosing what to buy."],
      ["Plan the next purchase", "Use the list as a starting point and confirm with the supplier."],
    ],
    users: ["Shop owner", "Buyer", "Stock manager"],
    connected: [
      ["Inventory management", "Use current product and stock records."],
      ["Sales tracking", "See which products are moving through sales."],
      ["Supplier records", "Keep the supplier and supply history easy to find."],
    ],
    timeSaved:
      "Storvex does not buy stock for you. It gives you a shorter list to check, so you spend less time walking past every shelf before buying stock.",
    ctaTitle: "Find low stock before the shelf is empty.",
    ctaText: "Use sales and stock records to make the next buying check faster.",
    ctaLabel: "Start checking low stock",
    related: ["inventory-management", "sales-tracking", "multi-branch-management"],
    marketplaceRelevant: true,
  },
  {
    slug: "staff-management",
    title: "Staff Management for Shops | Storvex",
    description:
      "Give shop workers clear roles, limit access and keep important actions recorded. See who did what without giving everyone full control.",
    eyebrow: "Staff management",
    h1: "Let workers do their job without giving everyone full control.",
    intro:
      "Storvex lets the owner choose what each worker can use. Important shop actions stay connected to the person who did them.",
    accent: "red",
    layout: "control",
    outcomesTitle: "See who did what without asking everyone.",
    stepsTitle: "Give each worker the right level of access.",
    connectedTitle: "Worker records stay connected to the work they do.",
    timeSavedTitle: "Save who did it once. Check it later.",
    proofLabel: "Worker access",
    proofTitle: "Give access based on the work each person does",
    proofRows: [
      ["Cashier", "Record sales and use allowed selling tools"],
      ["Stock worker", "Work with products and stock when permitted"],
      ["Manager", "Review the parts of the shop the owner allows"],
      ["Owner", "Keep full control of business settings and access"],
    ],
    problemTitle: "Shared accounts make mistakes hard to explain.",
    problemText:
      "When every worker uses the same login, the owner cannot easily know who changed a product or completed an action. Separate access creates a clearer record.",
    outcomes: [
      ["Set clear limits", "Workers see the tools needed for their job instead of every owner control."],
      ["Find who acted", "Use recorded user activity when checking an important change."],
      ["Change access faster", "Update a role when a worker’s job changes."],
    ],
    steps: [
      ["Add the worker", "Create a separate user for the person working in the shop."],
      ["Choose the role", "Give access that matches the work the person needs to do."],
      ["Connect the branch", "Keep branch access limited when the worker belongs to one location."],
      ["Review important actions", "Use the saved record instead of asking everyone who made a change."],
    ],
    users: ["Shop owner", "Store manager", "Cashier"],
    connected: [
      ["Cash control", "Connect drawer work to the right user."],
      ["Sales tracking", "Keep the worker on each recorded sale."],
      ["Multi-branch management", "Limit access to the right branch."],
    ],
    timeSaved:
      "Clear user records reduce the time spent asking who changed something. They also let the owner update one person’s access without changing access for the whole shop.",
    ctaTitle: "Give each worker the access they need.",
    ctaText: "Keep owner controls protected while workers use the tools for their job.",
    ctaLabel: "Set up worker access",
    related: ["cash-control", "sales-tracking", "multi-branch-management"],
  },
];

export const solutionPageSlugs = solutionPages.map((page) => page.slug);

export function getSolutionPage(slug) {
  return solutionPages.find((page) => page.slug === slug) || null;
}

export function isSolutionPageSlug(slug) {
  return solutionPageSlugs.includes(String(slug || ""));
}

export function solutionCanonical(slug) {
  return `${SITE_URL}/solutions/${slug}`;
}
