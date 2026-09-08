const HISTORICAL_TIMEZONE = "Africa/Kigali";

function cleanTimezone(value) {
  const timezone = String(value || "").trim();
  return timezone || "";
}

export function tenantTimezone(market) {
  return cleanTimezone(market?.timezone) || HISTORICAL_TIMEZONE;
}

function safeDate(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTenantDateTime(value, market) {
  const date = safeDate(value);
  if (!date) return "—";

  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: tenantTimezone(market),
    }).format(date);
  } catch {
    return "—";
  }
}

export function formatTenantDate(value, market, fallback = "—") {
  const date = safeDate(value);
  if (!date) return fallback;

  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeZone: tenantTimezone(market),
    }).format(date);
  } catch {
    return fallback;
  }
}

function calendarParts(value, market) {
  const date = safeDate(value);
  if (!date) return null;

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tenantTimezone(market),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );

    if (!values.year || !values.month || !values.day) {
      return null;
    }

    return {
      year: values.year,
      month: values.month,
      day: values.day,
    };
  } catch {
    return null;
  }
}

export function tenantDateInput(value, market) {
  const parts = calendarParts(value, market);
  if (!parts) return "";

  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}


function utcCalendarDay(parts) {
  if (!parts) return null;

  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
  );
}

export function tenantDaysUntil(value, market, now = new Date()) {
  const target = utcCalendarDay(calendarParts(value, market));
  const current = utcCalendarDay(calendarParts(now, market));

  if (target === null || current === null) {
    return null;
  }

  return Math.round(
    (target - current) / 86_400_000,
  );
}
