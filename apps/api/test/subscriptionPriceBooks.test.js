const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getSubscriptionPriceBook,
  hasSubscriptionPriceBook,
  requireSubscriptionPriceBook,
  getSubscriptionPlanPrice,
} = require("../src/config/subscriptions/priceBooks");

const {
  getTrialPlanForMarket,
  getPaidPlansForMarket,
  getPlanForMarket,
  getPlanSnapshotForMarket,
  getSubscriptionCatalogueForMarket,
} = require("../src/config/subscriptions/pricing");

test("Rwanda has the first Storvex subscription price book", () => {
  const priceBook = getSubscriptionPriceBook("RW");

  assert.ok(priceBook);
  assert.equal(priceBook.countryCode, "RW");
  assert.equal(priceBook.currencyCode, "RWF");
});

test("Rwanda launch prices are explicit in RWF", () => {
  assert.deepEqual(
    getSubscriptionPlanPrice({
      countryCode: "RW",
      planKey: "LAUNCH_STARTER",
      cycleKey: "M1",
    }),
    {
      countryCode: "RW",
      currencyCode: "RWF",
      amount: 10000,
      planKey: "LAUNCH_STARTER",
      cycleKey: "M1",
    },
  );

  assert.equal(
    getSubscriptionPlanPrice({
      countryCode: "RW",
      planKey: "LAUNCH_GROWTH",
      cycleKey: "M1",
    }).amount,
    25000,
  );

  assert.equal(
    getSubscriptionPlanPrice({
      countryCode: "RW",
      planKey: "LAUNCH_BUSINESS",
      cycleKey: "M1",
    }).amount,
    45000,
  );
});

test("Rwanda paid plans use Rwanda price book", () => {
  const plans = getPaidPlansForMarket("RW");

  assert.equal(plans.length, 3);

  assert.deepEqual(
    plans.map((plan) => ({
      key: plan.key,
      price: plan.price,
      currency: plan.currency,
      countryCode: plan.countryCode,
    })),
    [
      {
        key: "LAUNCH_STARTER",
        price: 10000,
        currency: "RWF",
        countryCode: "RW",
      },
      {
        key: "LAUNCH_GROWTH",
        price: 25000,
        currency: "RWF",
        countryCode: "RW",
      },
      {
        key: "LAUNCH_BUSINESS",
        price: 45000,
        currency: "RWF",
        countryCode: "RW",
      },
    ],
  );
});

test("trial is free but carries the market currency identity", () => {
  const trial = getTrialPlanForMarket("RW");

  assert.equal(trial.price, 0);
  assert.equal(trial.currency, "RWF");
  assert.equal(trial.countryCode, "RW");
});

test("plan aliases still resolve before market pricing", () => {
  const plan = getPlanForMarket("SOLO_M1", "RW");

  assert.ok(plan);
  assert.equal(plan.key, "LAUNCH_STARTER");
  assert.equal(plan.price, 10000);
  assert.equal(plan.currency, "RWF");
});

test("market-aware snapshot contains country-specific commercial values", () => {
  const snapshot = getPlanSnapshotForMarket(
    "LAUNCH_GROWTH",
    "RW",
  );

  assert.ok(snapshot);
  assert.equal(snapshot.price, 25000);
  assert.equal(snapshot.currency, "RWF");
  assert.equal(snapshot.countryCode, "RW");
});

test("catalogue is server-authoritative for one country", () => {
  const catalogue = getSubscriptionCatalogueForMarket("RW");

  assert.equal(catalogue.countryCode, "RW");
  assert.equal(catalogue.currencyCode, "RWF");
  assert.equal(catalogue.trial.price, 0);
  assert.equal(catalogue.plans.length, 3);
});

test("Kenya has an explicit local Storvex price book", () => {
  assert.equal(hasSubscriptionPriceBook("KE"), true);

  const book = requireSubscriptionPriceBook("KE");

  assert.equal(book.countryCode, "KE");
  assert.equal(book.currencyCode, "KES");

  const starter = getSubscriptionPlanPrice({
    countryCode: "KE",
    planKey: "LAUNCH_STARTER",
    cycleKey: "M1",
  });

  assert.equal(starter.amount, 1500);
  assert.equal(starter.currencyCode, "KES");
});

test("Uganda has an explicit local Storvex price book", () => {
  assert.equal(hasSubscriptionPriceBook("UG"), true);

  const plans = getPaidPlansForMarket("UG");

  assert.equal(plans.length, 3);
  assert.equal(plans[0].currency, "UGX");

  const starter = getSubscriptionPlanPrice({
    countryCode: "UG",
    planKey: "LAUNCH_STARTER",
    cycleKey: "M1",
  });

  assert.equal(starter.amount, 30000);
  assert.equal(starter.currencyCode, "UGX");
});

test("another market uses its own price instead of Rwanda pricing", () => {
  const rwandaStarter = getSubscriptionPlanPrice({
    countryCode: "RW",
    planKey: "LAUNCH_STARTER",
    cycleKey: "M1",
  });

  const kenyaStarter = getSubscriptionPlanPrice({
    countryCode: "KE",
    planKey: "LAUNCH_STARTER",
    cycleKey: "M1",
  });

  assert.equal(rwandaStarter.amount, 10000);
  assert.equal(rwandaStarter.currencyCode, "RWF");

  assert.equal(kenyaStarter.amount, 1500);
  assert.equal(kenyaStarter.currencyCode, "KES");
});

test("Kenya free trial carries Kenya market identity", () => {
  const trial = getTrialPlanForMarket("KE");

  assert.equal(trial.price, 0);
  assert.equal(trial.currency, "KES");
  assert.equal(trial.countryCode, "KE");
});

test("Uganda free trial carries Uganda market identity", () => {
  const trial = getTrialPlanForMarket("UG");

  assert.equal(trial.price, 0);
  assert.equal(trial.currency, "UGX");
  assert.equal(trial.countryCode, "UG");
});
