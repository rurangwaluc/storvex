const HISTORICAL_CURRENCY_CODE = "RWF";

function normalizeCurrencyCode(value) {
  const code = String(value || "")
    .trim()
    .toUpperCase();

  return /^[A-Z]{3}$/.test(code) ? code : "";
}

function safeMoneyNumber(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function tenantCurrencyCode(market) {
  return normalizeCurrencyCode(market?.currencyCode) || HISTORICAL_CURRENCY_CODE;
}

export function formatTenantMoney(value, market) {
  const currencyCode = tenantCurrencyCode(market);
  const amount = safeMoneyNumber(value);

  const formatted = new Intl.NumberFormat("en", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));

  return `${currencyCode} ${formatted}`;
}

export function formatMoneyWithCurrency(value, currencyCode) {
  return formatTenantMoney(value, {
    currencyCode: normalizeCurrencyCode(currencyCode) || HISTORICAL_CURRENCY_CODE,
  });
}
