const MARKET_DAILY_RENT = {
  Dallas: 92,
  Phoenix: 88,
  Atlanta: 81,
  Nashville: 84,
  Columbus: 78,
  Cincinnati: 76,
  Birmingham: 72,
  Huntsville: 75,
  Charleston: 86,
};

function parseMoneyLike(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const isNegative = /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed.replace(/[(),$,\s]/g, "");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) return null;
  return isNegative ? -parsed : parsed;
}

export function getMonthlyRentValue(row) {
  const candidates = [
    row?.monthlyRentValue,
    row?.monthlyRent,
    row?.monthly_rent,
    row?.monthly_rent_value,
    row?.rent,
    row?.rentAmount,
    row?.rent_amount,
    row?.marketRent,
    row?.market_rent,
    row?.askingRent,
    row?.asking_rent,
    row?.leaseRent,
    row?.lease_rent,
    row?.actualRent,
    row?.actual_rent,
  ];

  for (const candidate of candidates) {
    const parsed = parseMoneyLike(candidate);
    if (parsed && parsed > 0) return parsed;
  }

  return null;
}

export function getDailyRentValue(row) {
  const explicitDailyCandidates = [
    row?.dailyRentValue,
    row?.dailyRent,
    row?.daily_rent,
    row?.rentPerDay,
    row?.rent_per_day,
    row?.perDayRent,
  ];

  for (const candidate of explicitDailyCandidates) {
    const parsed = parseMoneyLike(candidate);
    if (parsed && parsed > 0) return Number(parsed.toFixed(2));
  }

  const monthly = getMonthlyRentValue(row);
  if (monthly && monthly > 0) {
    return Number((monthly / 30).toFixed(2));
  }

  return MARKET_DAILY_RENT[row?.market] || 80;
}

export function getRentSourceLabel(row) {
  const explicitDailyCandidates = [
    row?.dailyRentValue,
    row?.dailyRent,
    row?.daily_rent,
    row?.rentPerDay,
  ];

  for (const candidate of explicitDailyCandidates) {
    const parsed = parseMoneyLike(candidate);
    if (parsed && parsed > 0) return "Imported daily rent";
  }

  const monthly = getMonthlyRentValue(row);
  if (monthly && monthly > 0) return "Imported monthly rent";

  return "Market fallback";
}

export function getRevenueProtected(daysSaved, row) {
  const dailyRentValue = getDailyRentValue(row);
  return Math.round(Math.max(0, daysSaved) * dailyRentValue);
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;

  const raw = String(dateStr).trim();

  const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

function toYmd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function shiftDate(dateStr, deltaDays) {
  const date = parseLocalDate(dateStr);
  if (!date) return dateStr;

  date.setDate(date.getDate() + deltaDays);
  return toYmd(date);
}

export function formatShortDate(dateStr) {
  const date = parseLocalDate(dateStr);
  if (!date) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}